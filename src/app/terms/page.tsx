
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-8">
        <Card className="w-full relative shadow-lg">
            <CardHeader className="text-center items-center">
                <FileText className="h-10 w-10 text-primary" />
                <CardTitle className="font-headline text-3xl mt-4">Terms of Service</CardTitle>
                <CardDescription>
                    Legal terms governing the use of SYNAPPSE services.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
                 <p>Last Updated: June 23, 2025</p>
                <p>Welcome to SYNAPPSE! These Terms of Service ("Terms") govern your access to and use of the SYNAPPSE website (synappse.vercel.app/) and all related services, content, and functionalities (collectively, the "Services") provided by SYNAPPSE ("we," "us," or "our").</p>
                <p>By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.</p>

                <h4 className="font-bold text-lg pt-4">1. Acceptance of Terms</h4>
                <p>By using SYNAPPSE Services, you confirm that you are at least 18 years old and agree to comply with and be bound by these Terms, as well as our Privacy Policy.</p>

                <h4 className="font-bold text-lg pt-4">2. Description of Services</h4>
                <p>SYNAPPSE provides innovative digital creation services, including but not limited to:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Digital Content & Design: Brand Style Guides, Ad Campaign Posters/Pubmats, Website Visual Concepts, Logos, 3D Product Models, Animated Group Websites, and other digital visual content.</li>
                    <li>On-Site Computer Servicing: Troubleshooting, repair, setup, and maintenance of computer systems.</li>
                </ul>
                <p>We reserve the right to modify or discontinue any part of the Services at any time without notice.</p>

                <h4 className="font-bold text-lg pt-4">3. User Responsibilities</h4>
                <p>As a user of SYNAPPSE Services, you agree to:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Provide accurate and complete information when engaging with our Services (e.g., during inquiries, project requests).</li>
                    <li>Use the Services only for lawful purposes and in compliance with all applicable laws and regulations in the Philippines.</li>
                    <li>Not engage in any activity that could damage, disable, overburden, or impair our Services or interfere with any other party's use of our Services.</li>
                    <li>Not attempt to gain unauthorized access to any part of our Services, other accounts, computer systems, or networks connected to our Services.</li>
                </ul>

                <h4 className="font-bold text-lg pt-4">4. Intellectual Property</h4>
                <p><strong>Our Content:</strong> All content on the SYNAPPSE website, including text, graphics, logos, images, software, and the compilation thereof, is the property of SYNAPPSE or its content suppliers and protected by Philippine and international copyright laws.</p>
                <p><strong>Your Project Content:</strong> For design projects, you retain ownership of the intellectual property rights in any content you provide to us for the purpose of creating your project. SYNAPPSE retains the right to display completed projects in its portfolio for promotional purposes, unless otherwise agreed upon in writing.</p>
                <p><strong>Service-Specific Deliverables:</strong> Upon full payment for completed services, ownership of the final deliverables (e.g., completed design files, website visual concepts) will transfer to you, as specified in your individual service agreement or project contract.</p>

                <h4 className="font-bold text-lg pt-4">5. Payment Terms (For Paid Services)</h4>
                <p>All fees for services rendered will be agreed upon in a separate service agreement or project proposal.</p>
                <p>Payment terms, including deposit requirements, milestone payments, and final payment, will be specified in the individual agreement.</p>
                <p>Failure to make timely payments may result in the suspension or termination of Services.</p>

                <h4 className="font-bold text-lg pt-4">6. Disclaimers and Limitation of Liability</h4>
                <p><strong>No Warranties:</strong> The Services are provided "as is" and "as available" without any warranties of any kind, either express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
                <p><strong>Service Performance:</strong> While we strive for excellence, SYNAPPSE does not guarantee that the Services will be uninterrupted, error-free, or secure.</p>
                <p><strong>Limitation of Liability:</strong> In no event shall SYNAPPSE, its owners, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Services; (ii) any conduct or content of any third party on the Services; (iii) any content obtained from the Services; or (iv) unauthorized access, use, or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence), or any other legal theory, whether or not we have been informed of the possibility of such damage.</p>
                <p>In no event shall SYNAPPSE's total liability to you for all damages, losses, and causes of action exceed the amount paid by you, if any, for accessing or using our Services within the six (6) months immediately preceding the date of the claim.</p>
                <p><strong>Specific for On-Site Computer Servicing:</strong> While our partners exercise due diligence, SYNAPPSE is not responsible for any data loss, hardware damage, or other unforeseen issues that may occur during the troubleshooting, repair, or maintenance of computer systems. Clients are strongly advised to back up all critical data before any on-site service commences.</p>

                <h4 className="font-bold text-lg pt-4">7. Indemnification</h4>
                <p>You agree to defend, indemnify, and hold harmless SYNAPPSE, its owners, employees, contractors, agents, officers, and directors from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Services, by you or any person using your account and password; b) a breach of these Terms; or c) any content posted by you on the Services.</p>

                <h4 className="font-bold text-lg pt-4">8. Governing Law</h4>
                <p>These Terms shall be governed and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions.</p>

                <h4 className="font-bold text-lg pt-4">9. Dispute Resolution</h4>
                <p>Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, or validity thereof, shall be primarily resolved through good faith negotiation between the parties. If an amicable settlement cannot be reached, the dispute shall be submitted to the competent courts of Taguig City, Metro Manila, Philippines, to the exclusion of all other courts.</p>

                <h4 className="font-bold text-lg pt-4">10. Changes to Terms</h4>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Services after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Services.</p>

                <h4 className="font-bold text-lg pt-4">11. Termination</h4>
                <p>We may terminate or suspend your access to our Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Services will immediately cease.</p>

                <h4 className="font-bold text-lg pt-4">12. Contact Information</h4>
                <p>If you have any questions about these Terms of Service, please contact us at:<br />
                Email: synpps@gmail.com<br />
                Website: synappse.vercel.app/</p>
            </CardContent>
        </Card>
    </div>
  );
}
