import {genkit} from 'genkit';
// Do not import googleAI here for global initialization

export const ai = genkit({
  plugins: [], // No global Google AI plugin
  model: 'googleai/gemini-1.5-flash-latest', // Keep for potential default, but flows will specify
  // You might need to add other non-API-key-dependent plugins here if you have them.
});
