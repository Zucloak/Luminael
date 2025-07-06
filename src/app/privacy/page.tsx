import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Luminael AI',
  description: 'Luminael AI Privacy Policy: Your Privacy is My Default Priority.', // Pronoun updated
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl prose dark:prose-invert lg:prose-xl">
      <h1 className="text-3xl font-bold mb-6 font-headline text-center">Privacy Policy</h1>
      {/* Simplified title, description moved to metadata or could be a <p> here */}
      <p className="mb-6 text-center text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

      <section className="mb-8">
        <p>
          Luminael AI (&quot;the Service&quot;) is provided by me, Ken Mosquera (operating as SYNAPPSE). In this policy, references to &quot;I,&quot; &quot;me,&quot; and &quot;my&quot; refer to the provider of Luminael AI. I believe you should own and control your data, always. This Privacy Policy explains my commitment to your privacy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mt-6 mb-4 font-headline">Scope of This Policy and Relation to SYNAPPSE</h2>
        <p>
          This Privacy Policy pertains specifically to your use of the Luminael AI application (&quot;the Service&quot;) and its data handling practices as described herein. Luminael AI is a product developed and maintained by Ken Mosquera (operating as SYNAPPSE).
        </p>
        <p>
          While Luminael AI adheres to the principles of zero user data collection by its application servers (as detailed in this policy), please be aware that direct interactions with SYNAPPSE outside of the Luminael AI application—such as visiting the SYNAPPSE company website (synappse.vercel.app), contacting me for support via email, or other business communications—may be subject to different data handling practices. Any such practices would be covered by SYNAPPSE's own operational policies, separate from this Luminael AI product-specific policy.
        </p>
        <p>
          For clarity: your use of the Luminael AI application remains governed by the strict privacy (no data collection by the application) principles outlined below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mt-6 mb-4 font-headline">The Luminael Privacy Guarantee</h2>

        <h3 className="text-xl font-semibold mb-3 mt-5">I Do Not Collect Your Personal Data</h3>
        <p>
          Luminael operates without a traditional backend server or database for storing user-specific operational data related to your direct use of the core quiz generation features. This means I fundamentally cannot—and do not—collect, see, store, or repurpose any of your personal information or the content you process through the core functionalities. This includes:
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
          It is <strong>never sent to my servers (Luminael AI operates without them for this purpose), and I have zero access to it.</strong> The API key is used directly by your browser to communicate with the Google API (or other third-party AI model providers you choose to use via their API key). This ensures complete confidentiality of your API key from Luminael.
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
          <li><strong>API Usage Tracking (`luminael_api_usage`):</strong> To help you manage your API key&apos;s daily usage limits, the application locally stores a daily counter of how many times you&apos;ve used your API key within Luminael. This information is stored in your browser&apos;s `localStorage`, resets daily, and is only used to display your usage to you. It is not sent to any server.</li>
        </ul>
        <p>
          You have full control to review, delete, or clear this data at any time through your browser&apos;s developer tools and site settings. I believe in empowering you, and that starts with giving you complete ownership and control over information stored by the application on your own device.
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
          Luminael aims to minimize data collection. I may use essential cookies for basic website functionality. If I use any analytics services (e.g., for website traffic analysis), these services will be configured to respect user privacy, and I will not collect personally identifiable information through them. I do not use tracking cookies for advertising purposes.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Changes to This Privacy Policy</h3>
        <p>
          I may update this Privacy Policy from time to time. Notification of any changes will be made by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
        <p>
          If you have any questions about this Privacy Policy, please contact me:<br />
          <strong>Email:</strong> <a href="mailto:synpps@gmail.com">synpps@gmail.com</a><br />
          <strong>Personal Email:</strong> <a href="mailto:mosqueraken16@gmail.com">mosqueraken16@gmail.com</a><br />
          <strong>Website:</strong> <a href="https://synappse.vercel.app" target="_blank" rel="noopener noreferrer">synappse.vercel.app</a>
        </p>
      </section>

      <section className="mt-12 pt-6 border-t border-border">
        <h2 className="text-2xl font-semibold mb-4 text-center font-headline">A Note to My Friends at Google</h2>
        <p className="mb-3 text-center italic text-muted-foreground">
          Luminael is an experiment in radical accessibility and educational empowerment. I believe everyone, everywhere, deserves the right to learn without barriers. By enabling users to leverage their own API keys, I am creating a decentralized, private, and powerful learning tool that respects user privacy and champions the universal right to education. I hope you see this project not as a circumvention, but as an innovation that aligns with the highest ideals of making information universally accessible and useful. Let&apos;s not hinder this journey; let&apos;s champion it together.
        </p>
      </section>
    </div>
  );
}
