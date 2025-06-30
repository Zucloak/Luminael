
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-8">
        <Card className="w-full relative shadow-lg">
            <CardHeader className="text-center items-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
                <CardTitle className="font-headline text-3xl mt-4">Privacy Policy</CardTitle>
                <CardDescription>
                    How SYNAPPSE collects, uses, and protects your data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
                <h4 className="font-bold text-lg">SYNAPPSE Website Privacy Policy</h4>
                <p>Last Updated: June 23, 2025</p>
                <p>At SYNAPPSE, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how SYNAPPSE ("we," "us," or "our") collects, uses, processes, stores, and discloses your personal data when you use our website (synappse.vercel.app/) and all related services (collectively, the "Services").</p>
                <p>By accessing or using our Services, you signify your understanding of and consent to the practices described in this Privacy Policy. This policy is designed to comply with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).</p>

                <h4 className="font-bold text-lg pt-4">1. Information We Collect</h4>
                <p>We collect various types of information to provide and improve our Services to you:</p>
                <p><strong>Personal Information You Directly Provide:</strong> This includes information you voluntarily give us when you inquire about our services, sign up for programs (like the Pilot Program), engage us for projects, or communicate with us. This may include:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Contact Details: Your name, email address, phone number, and physical address (especially for on-site computer servicing).</li>
                    <li>Business Information: Your company name, industry, and specific project requirements or technical issues for design or IT services.</li>
                    <li>Communication Content: Records of your correspondence with us (e.g., emails, chat messages).</li>
                </ul>
                <p><strong>Usage Data (Automatically Collected):</strong> When you access and use our website, we may automatically collect certain information about your device and Browse activity. This Usage Data may include:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Your computer's Internet Protocol (IP) address.</li>
                    <li>Browser type and version.</li>
                    <li>Pages of our Service that you visit.</li>
                    <li>The time and date of your visit.</li>
                    <li>The time spent on those pages.</li>
                    <li>Unique device identifiers and other diagnostic data.</li>
                </ul>
                <p><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service. Examples of Cookies we may use include:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Session Cookies: To operate our Service.</li>
                    <li>Preference Cookies: To remember your preferences and various settings.</li>
                    <li>Security Cookies: For security purposes.</li>
                </ul>

                <h4 className="font-bold text-lg pt-4">2. How We Use Your Information</h4>
                <p>SYNAPPSE uses the collected data for various purposes:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>To provide, operate, and maintain our Services.</li>
                    <li>To fulfill and manage your requests for design, content creation, and on-site computer servicing projects.</li>
                    <li>To communicate with you, including responding to inquiries, providing project updates, and sending service-related notifications.</li>
                    <li>To improve, personalize, and expand our Services and website experience.</li>
                    <li>To understand and analyze how you use our Services (e.g., through website analytics).</li>
                    <li>To process payments for services rendered.</li>
                    <li>To detect, prevent, and address technical issues or fraudulent activities.</li>
                    <li>To comply with legal obligations and enforce our Terms of Service.</li>
                    <li>To send you promotional communications, newsletters, and information about special offers that may be of interest to you, always providing an option to opt-out.</li>
                </ul>

                <h4 className="font-bold text-lg pt-4">3. Sharing and Disclosure of Your Information</h4>
                <p>We may share your personal information in the following situations:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li><strong>With Service Providers and Partners:</strong> We may share your information with trusted third-party vendors, consultants, and other service providers who perform services on our behalf and require access to such information to do so. This includes:</li>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>On-Site Computer Service Partners: For the sole purpose of scheduling and executing on-site computer servicing, your contact details (name, address, contact number) and relevant technical issue descriptions will be shared with the individual friend(s) dispatched to perform the service. They are bound by confidentiality agreements.</li>
                        <li>Website Hosting and Analytics Providers: To operate our website and analyze its usage.</li>
                        <li>Payment Processors: To facilitate secure payment transactions (we do not store full credit card details on our servers).</li>
                    </ul>
                    <li><strong>For Legal Reasons:</strong> We may disclose your personal data if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency like the DTI or BIR).</li>
                    <li><strong>Business Transfers:</strong> In connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.</li>
                    <li><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your explicit consent.</li>
                </ul>

                <h4 className="font-bold text-lg pt-4">4. Data Security</h4>
                <p>The security of your personal data is important to us. We implement reasonable and appropriate organizational, physical, and technical measures designed to protect the personal data we collect from loss, misuse, unauthorized access, disclosure, alteration, and destruction. However, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.</p>

                <h4 className="font-bold text-lg pt-4">5. Data Retention</h4>
                <p>SYNAPPSE will retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy, to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.</p>

                <h4 className="font-bold text-lg pt-4">6. Your Rights Under the Data Privacy Act of 2012 (RA 10173)</h4>
                <p>As a data subject under Philippine law, you have the following rights regarding your personal data:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Right to Be Informed: You have the right to be informed whether personal information pertaining to you is being processed.</li>
                    <li>Right to Object: You have the right to object to the processing of your personal information, especially when it is used for direct marketing, automated processing, or profiling.</li>
                    <li>Right to Access: You have the right to reasonable access to your personal information that we process.</li>
                    <li>Right to Rectification: You have the right to dispute the inaccuracy or error in your personal information and have us correct it immediately and accordingly.</li>
                    <li>Right to Erasure or Blocking: You have the right to demand the suspension, withdrawal, removal, or destruction of your personal information from our filing system under certain circumstances.</li>
                    <li>Right to Claim Damages: You have the right to be indemnified for any damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of your personal information.</li>
                    <li>Right to Data Portability: You have the right to obtain a copy of your data in an electronic or structured format, commonly used and allows for further use.</li>
                    <li>Right to File a Complaint: If you believe your data privacy rights have been violated, you have the right to file a complaint with the National Privacy Commission (NPC).</li>
                </ul>
                <p>To exercise any of these rights, please contact us using the information provided in the "Contact Information" section below.</p>

                <h4 className="font-bold text-lg pt-4">7. Third-Party Links</h4>
                <p>Our Service may contain links to other websites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.</p>

                <h4 className="font-bold text-lg pt-4">8. Children's Privacy</h4>
                <p>Our Services are not intended for use by individuals under the age of 18. We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.</p>

                <h4 className="font-bold text-lg pt-4">9. Changes to This Privacy Policy</h4>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "Last Updated" date at the top of this Privacy Policy. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

                <h4 className="font-bold text-lg pt-4">10. Contact Information</h4>
                <p>If you have any questions about this Privacy Policy, your personal data, or wish to exercise your rights as a data subject, please contact us:<br />
                Email: synpps@gmail.com<br />
                Website: synappse.vercel.app/</p>
            </CardContent>
        </Card>
    </div>
  );
}
