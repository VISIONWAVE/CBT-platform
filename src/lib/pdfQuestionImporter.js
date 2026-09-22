import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeOptionText(text) {
  return cleanText(text)
    .replace(/^[A-E][.)]\s*/i, "")
    .trim();
}

export function parseQuestions(text) {
  const normalized = cleanText(text);

  const questionRegex =
    /(?:^|\n)\s*(\d{1,3})[.)]\s+/g;

  const matches = [];

  let match;

  while (
    (match = questionRegex.exec(normalized)) !== null
  ) {
    matches.push({
      number: Number(match[1]),
      start: match.index + match[0].length,
    });
  }

  const questions = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const end = next
      ? next.index
      : normalized.length;

    const rawQuestion = normalized
      .slice(current.start, end)
      .trim();

    if (!rawQuestion) {
      continue;
    }

    const optionRegex =
      /(?:^|\n)\s*([A-E])[.)]\s+/gi;

    const optionMatches = [
      ...rawQuestion.matchAll(optionRegex),
    ];

    const options = {
      A: "",
      B: "",
      C: "",
      D: "",
      E: "",
    };

    let questionText = rawQuestion;

    if (optionMatches.length > 0) {
      questionText = rawQuestion
        .slice(0, optionMatches[0].index)
        .trim();

      for (
        let j = 0;
        j < optionMatches.length;
        j++
      ) {
        const currentOption =
          optionMatches[j];

        const label =
          currentOption[1].toUpperCase();

        const start =
          currentOption.index +
          currentOption[0].length;

        const end =
          optionMatches[j + 1]
            ? optionMatches[j + 1].index
            : rawQuestion.length;

        options[label] =
          normalizeOptionText(
            rawQuestion.slice(
              start,
              end
            )
          );
      }
    }

    questions.push({
      question_number:
        current.number,

      question_text:
        cleanText(questionText),

      option_a: options.A,
      option_b: options.B,
      option_c: options.C,
      option_d: options.D,
      option_e: options.E,
    });
  }

  return questions;
}

export async function openPdf(file) {
  const buffer =
    await file.arrayBuffer();

  return pdfjsLib
    .getDocument({
      data: buffer,
    })
    .promise;
}

export async function renderPdfPage(
  pdf,
  pageNumber,
  scale = 2
) {
  const page =
    await pdf.getPage(pageNumber);

  const viewport =
    page.getViewport({
      scale,
    });

  const canvas =
    document.createElement("canvas");

  const context =
    canvas.getContext("2d", {
      willReadFrequently: true,
    });

  canvas.width =
    Math.ceil(viewport.width);

  canvas.height =
    Math.ceil(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    canvas,
    page,
    width: canvas.width,
    height: canvas.height,
  };
}

export async function createOcrWorker() {
  return createWorker("eng");
}

export async function recognizeCanvas(
  worker,
  canvas
) {
  const image =
    canvas.toDataURL("image/png");

  const result =
    await worker.recognize(image);

  return {
    text:
      result?.data?.text || "",

    confidence:
      result?.data?.confidence || 0,

    image,
  };
}

export async function processPdf({
  file,
  onProgress,
  onPage,
}) {
  const pdf =
    await openPdf(file);

  const worker =
    await createOcrWorker();

  const questions = [];

  try {
    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const rendered =
        await renderPdfPage(
          pdf,
          pageNumber
        );

      const ocr =
        await recognizeCanvas(
          worker,
          rendered.canvas
        );

      const pageQuestions =
        parseQuestions(
          ocr.text
        );

      for (
        const question of pageQuestions
      ) {
        questions.push({
          ...question,

          source_page:
            pageNumber,

          ocr_confidence:
            ocr.confidence,

          source_page_image:
            ocr.image,
        });
      }

      if (onPage) {
        await onPage({
          pageNumber,
          totalPages:
            pdf.numPages,

          text: ocr.text,

          questions:
            pageQuestions,

          confidence:
            ocr.confidence,

          image:
            ocr.image,
        });
      }

      if (onProgress) {
        onProgress(
          Math.round(
            (pageNumber /
              pdf.numPages) *
              100
          )
        );
      }
    }

    return {
      questions,
      pages:
        pdf.numPages,
    };
  } finally {
    await worker.terminate();
  }
}