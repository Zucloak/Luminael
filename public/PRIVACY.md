This Privacy Policy pertains specifically to your use of the Luminael AI application ("the Service") and its data handling practices as described herein. Luminael AI is a product developed and maintained by Ken Mosquera (operating as SYNAPPSE).

While Luminael AI adheres to the principles of zero user data collection by its application servers (as detailed in this policy), please be aware that direct interactions with SYNAPPSE outside of the Luminael AI application—such as visiting the SYNAPPSE company website (synappse.vercel.app), contacting me for support via email, or other business communications—may be subject to different data handling practices. Any such practices would be covered by SYNAPPSE's own operational policies, separate from this Luminael AI product-specific policy.

For clarity: your use of the Luminael AI application remains governed by the strict privacy (no data collection by the application) principles outlined below.

## The Luminael Privacy Guarantee

### I Do Not Collect Your Personal Data
Luminael operates without a traditional backend server or database for storing user-specific operational data related to your direct use of the core quiz generation features. This means I fundamentally cannot—and do not—collect, see, store, or repurpose any of your personal information or the content you process through the core functionalities. This includes:

- The content of your uploaded files (.txt, .pdf, .docx, images, etc.) used for quiz generation.
- The quizzes that are generated from your content.
- Your quiz scores or answers submitted during a quiz session.
- Your name, email address, or any other personal identifiers for the core service usage.

### Your API Key is Yours Alone
You provide your own Google Gemini API key (or other compatible keys in the future) to power the AI features of the app. This key is stored **exclusively in your browser's local storage (IndexedDB)**.

It is **never sent to my servers (Luminael AI operates without them for this purpose), and I have zero access to it.** The API key is used directly by your browser to communicate with the Google API (or other third-party AI model providers you choose to use via their API key). This ensures complete confidentiality of your API key from Luminael.

You are responsible for the security and management of your own API keys and for complying with the terms of service of the respective API providers (e.g., Google).

### How Your Content is Processed
When you upload study materials, they are processed locally within your browser. If you use an AI-powered feature (like quiz generation or AI-assisted OCR), the relevant text data is sent directly from your browser to the respective AI provider's API (e.g., Google Gemini) along with your API key.

Your original files and their content are handled by your browser; Luminael's infrastructure does not store them. For features like PDF or image OCR, the file data is read by your browser, processed (potentially converted to a data URI for images), and then, if AI OCR is used, this data is sent to the AI provider. Luminael's servers (if any are used for static site hosting or basic non-data-processing functions) do not log or retain this content.

### Your Data, Your Control: Local Storage
The only data that persists related to your interaction with Luminael is stored in your browser's local storage mechanisms (specifically IndexedDB). This includes:

- Your API key settings (if you choose to save them for convenience).
- Your saved quiz history (if you use the feature to save quizzes locally).

You have full control to review, delete, or clear this data at any time through your browser's developer tools and site settings. I believe in empowering you, and that starts with giving you complete ownership and control over information stored by the application on your own device.

### Third-Party Services
When you use your API key with a third-party AI provider (e.g., Google Gemini), your interaction with that provider is governed by their respective privacy policies and terms of service. Luminael is not responsible for the data practices of these third-party services.

### Cookies and Analytics
Luminael aims to minimize data collection. I may use essential cookies for basic website functionality. If I use any analytics services (e.g., for website traffic analysis), these services will be configured to respect user privacy, and I will not collect personally identifiable information through them. I do not use tracking cookies for advertising purposes.

### Changes to This Privacy Policy
I may update this Privacy Policy from time to time. Notification of any changes will be made by posting the new Privacy Policy on this page and updating the "Last Updated" date (Note: the dynamic "Last Updated" date will be part of the page.tsx component, not this Markdown). You are advised to review this Privacy Policy periodically for any changes.

### Contact Us
If you have any questions about this Privacy Policy, please contact me:

- **Email:** [synpps@gmail.com](mailto:synpps@gmail.com)
- **Personal Email:** [mosqueraken16@gmail.com](mailto:mosqueraken16@gmail.com)
- **Website:** [synappse.vercel.app](https://synappse.vercel.app)

---
## A Note to My Friends at Google
Luminael is an experiment in radical accessibility and educational empowerment. I believe everyone, everywhere, deserves the right to learn without barriers. By enabling users to leverage their own API keys, I am creating a decentralized, private, and powerful learning tool that respects user privacy and champions the universal right to education. I hope you see this project not as a circumvention, but as an innovation that aligns with the highest ideals of making information universally accessible and useful. Let's not hinder this journey; let's champion it together.
