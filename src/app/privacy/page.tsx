'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  User, 
  BookOpen, 
  CheckCircle,
  FileText,
  Mail,
  ExternalLink,
  AlertTriangle,
  Scale,
  Eye
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Magnetic } from '@/components/ui/Interactive'

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState('collected')

  const sections = [
    { id: 'collected', label: '1. Information We Collect', icon: FileText },
    { id: 'usage', label: '2. How We Use & Share Info', icon: Shield },
    { id: 'cookies', label: '3. Cookies & Tracking', icon: Eye },
    { id: 'security', label: '4. Data Security Measures', icon: Lock },
    { id: 'rights', label: '5. Your User Rights', icon: User },
    { id: 'retention', label: '6. Data Retention Period', icon: Scale },
    { id: 'thirdparty', label: '7. Third-Party Services', icon: ExternalLink },
    { id: 'transfers', label: '8. International Transfers', icon: BookOpen },
    { id: 'children', label: '9. Children’s Privacy', icon: AlertTriangle },
    { id: 'updates', label: '10. Policy Updates', icon: CheckCircle },
    { id: 'contact', label: '11. Contact Information', icon: Mail },
  ]

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200

      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: 'smooth'
      })
      setActiveSection(id)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-text selection:bg-violet-500/30 selection:text-violet-200">
      {/* Animated Background Gradients */}
      <motion.div 
        animate={{
          y: [0, -15, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-10 left-10 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{
          y: [0, 15, 0],
          scale: [1, 0.97, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-20 right-10 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-gray-900/80 bg-slate-950/75 backdrop-blur-md">
        <div className="w-full max-w-[92%] mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 group text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
          <div className="relative overflow-hidden flex items-center justify-center w-[125px] sm:w-[150px] md:w-[180px] h-16">
            <Link href="/">
              <img 
                src="/vanta_logo_full.jpg" 
                alt="Vanta" 
                className="object-cover w-[125px] sm:w-[150px] md:w-[180px] h-[125px] sm:h-[150px] md:h-[180px] cursor-pointer" 
              />
            </Link>
          </div>
          <div>
            <Link
              href="/login"
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-8 text-center border-b border-gray-900/60">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Data Protection</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3 leading-none">
          Privacy Policy
        </h1>
        <p className="text-xs text-gray-500">
          Last Updated: June 12, 2026 • Effective Date: June 12, 2026
        </p>
      </section>

      {/* Main Layout Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 lg:sticky lg:top-24 h-fit space-y-4">
            <div className="glass-panel border-gray-900/80 rounded-2xl p-4 space-y-1.5 shadow-xl">
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2.5 mb-2">
                Table of Contents
              </span>
              <nav className="space-y-0.5">
                {sections.map((sect) => {
                  const Icon = sect.icon
                  const isActive = activeSection === sect.id
                  return (
                    <button
                      key={sect.id}
                      onClick={() => scrollToSection(sect.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-violet-500/10 text-violet-400 border-l-2 border-violet-500 shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-slate-900/40 border-l-2 border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-violet-400' : 'text-gray-500'}`} />
                      <span className="truncate">{sect.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
            
            {/* Quick Actions Card */}
            <div className="glass-panel border-gray-900/60 bg-gradient-to-br from-slate-900/20 to-violet-950/10 rounded-2xl p-5 space-y-4 shadow-lg text-left">
              <h4 className="text-xs font-bold text-white">Privacy Questions?</h4>
              <p className="text-[10px] text-gray-400 leading-normal">
                Contact our privacy compliance desk for data access, portability, or deletion requests.
              </p>
              <Magnetic>
                <a 
                  href="mailto:privacy@vantahq.pro"
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-300 text-[10px] font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer w-full justify-center"
                >
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  <span>Email Privacy Desk</span>
                </a>
              </Magnetic>
            </div>
          </aside>

          {/* Privacy Content Column */}
          <section className="lg:col-span-3 space-y-12 pr-0 lg:pr-4 text-left">
            
            {/* Introductory Statement */}
            <div className="text-xs text-gray-300 space-y-4 leading-relaxed font-medium">
              <p>
                At Vanta (<strong>&quot;we,&quot; &quot;us,&quot;</strong> or <strong>&quot;our&quot;</strong>), we are committed to protecting your privacy and ensuring a transparent, secure experience when you use our platform at <Link href="/" className="text-violet-400 font-bold hover:underline">vantahq.pro</Link>. This Privacy Policy explains how we collect, use, share, and protect your personal information, as well as the rights you have regarding your data.
              </p>
              <p>
                Please read this document carefully to understand our practices. By accessing or using Vanta, you acknowledge that you have read and consent to the collection and processing of your information as described in this Privacy Policy.
              </p>
            </div>

            {/* Section 1 */}
            <div id="collected" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">1.</span> Information We Collect
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  We collect information that you provide to us directly, data collected automatically during platform interactions, and information from third-party services.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-400">
                  <li>
                    <strong>Personal Data:</strong> When you register an account, set up a profile, or subscribe to Premium, we collect information such as your name, email address, username, phone number, and avatar image.
                  </li>
                  <li>
                    <strong>Billing & Payment Data:</strong> Credit card numbers and billing transactions are processed securely through our payment provider, Stripe. We do not store full credit card details directly on Vanta servers; we retain only payment tokens, transaction status logs, and billing history.
                  </li>
                  <li>
                    <strong>Usage Data:</strong> We track your interactions on the Platform, including your calculator histories (ARV and MAO calculations), deal posting details, chat messages with JV partners, completed Learn Hub modules, daily streaks, earned badges, and XP points.
                  </li>
                  <li>
                    <strong>Technical Data:</strong> We automatically collect log files, IP addresses, browser types, device identifiers, operating systems, and page navigation patterns to monitor performance and enforce system firewalls.
                  </li>
                </ul>
              </div>
            </div>

            {/* Section 2 */}
            <div id="usage" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">2.</span> How We Use & Share Information
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  We use your personal data to run, secure, and improve the Vanta wholesaling ecosystem.
                </p>
                <p>
                  <strong>Purposes of Use:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li>Managing your user profile, calculations, and tracking daily streak rewards.</li>
                  <li>Providing real-time JV messaging connections and marketplace listing distribution.</li>
                  <li>Processing payments for Premium subscriptions and managing billing rate protections.</li>
                  <li>Analyzing deal statistics to validate AI ledger entries.</li>
                  <li>Detecting, preventing, and blocking bot scraping, spam, fraud, or terms violations.</li>
                </ul>
                <p>
                  <strong>Sharing with Third Parties:</strong> We do not sell your personal data. We share data only with trusted service providers necessary for platform operations (e.g. database hosting via Supabase, payments via Stripe, and AI processing APIs). These providers are legally bound to protect your data and are prohibited from using it for any other purpose.
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div id="cookies" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">3.</span> Cookies & Tracking Technologies
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Vanta uses cookies, local storage, and similar technologies to enhance navigation, maintain user authentication sessions, and analyze traffic patterns.
                </p>
                <p>
                  <strong>Types of Cookies Used:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong>Essential Cookies:</strong> Required to keep you signed in, manage cookies configurations, and protect access to premium features.</li>
                  <li><strong>Functional Cookies:</strong> Remember your preferences, such as selected sidebar states, calculator inputs, and dark theme variables.</li>
                  <li><strong>Analytical Cookies:</strong> Help us measure platform performance and identify which parts of the Learn Hub are most engaging.</li>
                </ul>
                <p>
                  <strong>Opt-Out:</strong> You can configure your browser settings to reject cookies or alert you when cookies are sent. Please note that disabling essential cookies will prevent you from signing in or accessing your Vanta wholesaling dashboard.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div id="security" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">4.</span> Data Security Measures
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  We prioritize security and implement technical, physical, and administrative guardrails to safeguard your personal data.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong>Encryption:</strong> All data transmitted between your device and Vanta servers is encrypted using Transport Layer Security (TLS) and SSL protocols. Stored data is kept in secure encrypted databases.</li>
                  <li><strong>Access Control:</strong> Access to sensitive backend systems and databases is strictly limited to authorized personnel with multi-factor authentication.</li>
                  <li><strong>Firewalls:</strong> We run application-layer rate limiters and firewalls to detect automated crawlers and block system penetration attempts.</li>
                </ul>
                <p>
                  While we work to secure your information, no system is entirely impenetrable. We cannot guarantee absolute security, and you use the Service at your own risk.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div id="rights" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">5.</span> Your User Rights
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Depending on your jurisdiction (such as CCPA in California or GDPR in Europe), you have specific legal rights regarding your personal data:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong>Right to Access:</strong> You can request a copy of the personal information we hold about you.</li>
                  <li><strong>Right to Rectification:</strong> You can correct incomplete or inaccurate data directly in your account settings.</li>
                  <li><strong>Right to Deletion:</strong> You have the right to request that we delete your account and erase all associated personal data from our servers.</li>
                  <li><strong>Right to Portability:</strong> You can request an export of your profile, posted deals, and calculation logs in a structured machine-readable format.</li>
                </ul>
                <p>
                  To exercise any of these rights, please contact our privacy compliance desk at <a href="mailto:privacy@vantahq.pro" className="text-violet-400 hover:underline">privacy@vantahq.pro</a>. We will verify your identity before processing any request.
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div id="retention" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">6.</span> Data Retention Period
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  We retain your information for as long as your account is active or as needed to provide you with the Service.
                </p>
                <p>
                  <strong>Active Accounts:</strong> We keep profile data, calculation histories, and progression XP active for the lifetime of your account.
                </p>
                <p>
                  <strong>Deleted Accounts:</strong> Upon receiving a deletion request, we will erase or anonymize your personal data within thirty (30) days, except where retention is required by law (such as tax/billing transaction history) or for legitimate dispute resolution purposes.
                </p>
              </div>
            </div>

            {/* Section 7 */}
            <div id="thirdparty" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">7.</span> Third-Party Services & Integrations
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Vanta integrates with third-party software components to handle transactions, security, and AI calculations:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong>Supabase:</strong> Provides database infrastructure, user registration sessions, and file storage. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-0.5">Supabase Privacy Policy<ExternalLink className="w-3 h-3 inline" /></a>.</li>
                  <li><strong>Stripe:</strong> Processes Premium subscription card payments. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-0.5">Stripe Privacy Policy<ExternalLink className="w-3 h-3 inline" /></a>.</li>
                  <li><strong>AI Processing APIs:</strong> Calculation verification and voice notes transcription are processed using API models. Stent data is used solely to generate outputs and is not stored or used by external models to train algorithms.</li>
                </ul>
                <p>
                  Our website may also contain links to external real estate portals or resources. We are not responsible for the privacy practices of external sites.
                </p>
              </div>
            </div>

            {/* Section 8 */}
            <div id="transfers" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">8.</span> International Data Transfers
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Vanta Inc. is based in the United States. The personal data we collect is processed and stored on servers located within the United States.
                </p>
                <p>
                  If you are accessing the Service from the European Union (EU), European Economic Area (EEA), or other regions with laws governing data collection and use, please note that your information will be transferred to and processed in the United States, which may not have the same level of data protection laws as your jurisdiction.
                </p>
                <p>
                  We utilize approved legal transfer mechanisms, such as Standard Contractual Clauses (SCCs), to ensure that your data receives an equivalent level of protection regardless of where it is processed.
                </p>
              </div>
            </div>

            {/* Section 9 */}
            <div id="children" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">9.</span> Children’s Privacy
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Vanta is designed exclusively for adult real estate wholesalers and investors. <strong>Our Service is not directed to individuals under the age of eighteen (18)</strong>, and we do not knowingly collect personal information from children under the age of thirteen (13).
                </p>
                <p>
                  If we discover that a child under thirteen has created a Vanta account and submitted personal data, we will take immediate steps to delete that account and remove the data from our databases. If you believe we have accidentally collected data from a child under thirteen, please notify us immediately.
                </p>
              </div>
            </div>

            {/* Section 10 */}
            <div id="updates" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">10.</span> Policy Updates Notification
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  We may modify or update this Privacy Policy from time to time to reflect changes in our services or legal requirements.
                </p>
                <p>
                  When changes are made, we will post the revised version on this page and update the &quot;Last Updated&quot; date at the top of the policy. For material changes that affect your privacy rights, we will notify you through the email associated with your account or by posting a prominent alert inside your user dashboard.
                </p>
                <p>
                  We encourage you to review this page periodically to stay informed about how we protect your information.
                </p>
              </div>
            </div>

            {/* Section 11 */}
            <div id="contact" className="scroll-mt-24 space-y-4 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">11.</span> Contact Information
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  If you have questions, comments, or compliance concerns regarding this Privacy Policy or our data management practices, please contact our privacy desk at:
                </p>
                <div className="glass-panel border-gray-900 rounded-xl p-4 space-y-2 mt-2 w-fit">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="font-bold text-white">Email:</span>
                    <a href="mailto:privacy@vantahq.pro" className="text-violet-400 hover:underline">privacy@vantahq.pro</a>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-white">Department:</span>
                    <span className="text-gray-400">Data Protection & Compliance</span>
                  </div>
                </div>
              </div>
            </div>

          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-950 bg-black/40 py-10 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex justify-center gap-6 text-[11px] font-bold text-gray-400">
            <Link href="/" className="hover:text-white transition-colors animated-underline">Home</Link>
            <Link href="/terms" className="hover:text-white transition-colors animated-underline">Terms of Service</Link>
            <Link href="/privacy" className="text-white border-b border-violet-500/40">Privacy Policy</Link>
            <Link href="/login" className="hover:text-white transition-colors animated-underline font-semibold">Sign In</Link>
          </div>
          <p>© 2026 Vanta Inc. All rights reserved. Not a real estate brokerage.</p>
        </div>
      </footer>
    </div>
  )
}
