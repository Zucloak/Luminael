import {GoogleGenerativeAI, Schema} from '@google/generative-ai';
import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';

const extractLatexRequestSchema = z.object({
  apiKey: z.string(),
  imageDataUri: z
    .string()
    .refine(
      uri => uri.startsWith('data:image/'),
      'Image data URI is required.'
    ),
});

// This Zod schema is for our internal validation of the JSON we get back
const extractLatexResponseSchema = z.object({
  latex_representation: z.string(),
  confidence_score: z.number(),
  error: z.string().optional(),
});

// This is the JSON Schema the Google API expects
const GoogleResponseSchema: Schema = {
  type: 'OBJECT',
  properties: {
    latex_representation: {type: 'STRING'},
    confidence_score: {type: 'NUMBER'},
    error: {type: 'STRING'},
  },
  required: ['latex_representation', 'confidence_score'],
};

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
    extractLatexRequestSchema.parse(requestBody);
  } catch (error) {
    return NextResponse.json({error: 'Invalid request body.'}, {status: 400});
  }

  const {apiKey, imageDataUri} = requestBody;

  if (!apiKey) {
    return NextResponse.json({error: 'API key is required.'}, {status: 401});
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
  });

  const mimeType = imageDataUri.match(/data:(image\/[a-zA-Z0-9-.+]+);base64,/)?.[1];
  if (!mimeType) {
    return NextResponse.json(
      {error: 'Could not determine MIME type from data URI.'},
      {status: 400}
    );
  }
  const imageBase64 = imageDataUri.split(',')[1];

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const prompt = `
    You are a specialist in optical character recognition (OCR) for mathematical and scientific notation.
    Your sole purpose is to analyze an image containing mathematical expressions (handwritten or typed) and convert it into a perfect, error-free LaTeX representation.

    RULES:
    1.  Analyze the provided image.
    2.  Identify all mathematical notation.
    3.  Convert the notation into the most accurate and clean LaTeX code possible. Ensure the generated LaTeX is strictly valid. For example, use $x^{2}$ instead of $x^2$.
    4.  Estimate a confidence score between 0.0 and 1.0 for your conversion, where 1.0 is absolute certainty.
    5.  Return ONLY a JSON object with the following structure:
        {
          "latex_representation": "your_latex_string_here",
          "confidence_score": your_confidence_score_here
        }
    6. If the image does not appear to contain any discernible mathematical notation, return a JSON object with an error field:
        {
           "error": "No mathematical notation detected in the image."
        }
    Do not add any explanations, apologies, or conversational text. Your entire response must be the raw JSON object.
    `;

  try {
    const result = await model.generateContent({
      contents: [{role: 'user', parts: [imagePart, {text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: GoogleResponseSchema,
      },
    });

    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);

    extractLatexResponseSchema.parse(parsedJson);

    return NextResponse.json(parsedJson, {status: 200});
  } catch (error: any) {
    console.error('Error during LaTeX extraction:', error);
    let errorMessage = 'An unexpected error occurred during LaTeX extraction.';
    if (error.message) {
      errorMessage = error.message;
    }
    if (error instanceof z.ZodError) {
      errorMessage = 'AI returned an object with an invalid structure.';
    }
    return NextResponse.json(
      {error: 'Failed to extract LaTeX: ' + errorMessage},
      {status: 500}
    );
  }
}
