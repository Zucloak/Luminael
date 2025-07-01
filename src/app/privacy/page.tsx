// src/app/privacy/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Luminael AI',
  description: 'Luminael AI Privacy Policy: Your Privacy is Our Default.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl prose dark:prose-invert lg:prose-xl">
      <h1 className="text-3xl font-bold mb-6 font-headline text-center">Privacy Policy: Your Privacy is Our Default</h1>
      <p className="mb-6 text-center text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

      <section className="mb-8">
        <p>
          Luminael AI (&quot;the Service,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is designed from the ground up to be a private, secure, client-side application. We believe you should own and control your data, always. This Privacy Policy explains our commitment to your privacy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mt-6 mb-4 font-headline">The Luminael Privacy Guarantee</h2>

        <h3 className="text-xl font-semibold mb-3 mt-5">We Do Not Collect Your Personal Data</h3>
        <p>
          Luminael operates without a traditional backend server or database for storing user-specific operational data related to your direct use of the core quiz generation features. This means we fundamentally cannot—and do not—collect, see, store, or repurpose any of your personal information or the content you process through the core functionalities. This includes:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1 pl-4">
          <li>The content of your uploaded files (.txt, .pdf, .docx, images, etc.) used for quiz generation.</li>
          <li>The quizzes that are generated from your content.</li>
          <li>Your quiz scores or answers submitted during a quiz session.</li>
          <li>Your name, email address, or any other personal identifiers for the core service usage.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Your API Key is Yours Alone</h3>
        <p>
          You provide your own Google Gemini API key (or other compatible keys in the future) to power the AI features of the app. This key is stored <strong>exclusively in your browser&apos;s local storage (IndexedDB)</strong>.
        </p>
        <p>
          It is <strong>never sent to our servers, and we have zero access to it.</strong> The API key is used directly by your browser to communicate with the Google API (or other third-party AI model providers you choose to use via their API key). This ensures complete confidentiality of your API key from Luminael.
        </p>
        <p>
          You are responsible for the security and management of your own API keys and for complying with the terms of service of the respective API providers (e.g., Google).
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">How Your Content is Processed</h3>
        <p>
          When you upload study materials, they are processed locally within your browser. If you use an AI-powered feature (like quiz generation or AI-assisted OCR), the relevant text data is sent directly from your browser to the respective AI provider&apos;s API (e.g., Google Gemini) along with your API key.
        </p>
        <p>
          Your original files and their content are handled by your browser; Luminael&apos;s infrastructure does not store them. For features like PDF or image OCR, the file data is read by your browser, processed (potentially converted to a data URI for images), and then, if AI OCR is used, this data is sent to the AI provider. Luminael&apos;s servers (if any are used for static site hosting or basic non-data-processing functions) do not log or retain this content.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Your Data, Your Control: Local Storage</h3>
        <p>
          The only data that persists related to your interaction with Luminael is stored in your browser&apos;s local storage mechanisms (specifically IndexedDB). This includes:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1 pl-4">
          <li>Your API key settings (if you choose to save them for convenience).</li>
          <li>Your saved quiz history (if you use the feature to save quizzes locally).</li>
        </ul>
        <p>
          You have full control to review, delete, or clear this data at any time through your browser&apos;s developer tools and site settings. We believe in empowering you, and that starts with giving you complete ownership and control over information stored by the application on your own device.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Third-Party Services</h3>
        <p>
          When you use your API key with a third-party AI provider (e.g., Google Gemini), your interaction with that provider is governed by their respective privacy policies and terms of service. Luminael is not responsible for the data practices of these third-party services.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Cookies and Analytics</h3>
        <p>
          Luminael aims to minimize data collection. We may use essential cookies for basic website functionality. If we use any analytics services (e.g., for website traffic analysis), these services will be configured to respect user privacy, and we will not collect personally identifiable information through them. We do not use tracking cookies for advertising purposes.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Changes to This Privacy Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
        <p>
          If you have any questions about these Terms of Service, please contact us. please contact us. 
            Email: synpps@gmailcom or in my personal email mosqueraken16@gmail.com
            Website: synappse.vercel.app
        </p>
      </section>

      <section className="mt-12 pt-6 border-t border-border">
        <h2 className="text-2xl font-semibold mb-4 text-center font-headline">A Note to Our Friends at Google</h2>
        <p className="mb-3 text-center italic text-muted-foreground">
          Luminael is an experiment in radical accessibility and educational empowerment. We believe everyone, everywhere, deserves the right to learn without barriers. By enabling users to leverage their own API keys, we are creating a decentralized, private, and powerful learning tool that respects user privacy and champions the universal right to education. We hope you see this project not as a circumvention, but as an innovation that aligns with the highest ideals of making information universally accessible and useful. Let&apos;s not hinder this journey; let&apos;s champion it together.
        </p>
      </section>
    </div>
  );
}
