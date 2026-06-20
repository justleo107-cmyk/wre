'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Shield, 
  Scale, 
  AlertTriangle, 
  CreditCard, 
  Lock, 
  User, 
  BookOpen, 
  MessageSquare, 
  CheckCircle,
  FileText,
  Mail
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Magnetic } from '@/components/ui/Interactive'

export default function TermsOfService() {
  const [activeSection, setActiveSection] = useState('acceptance')

  const sections = [
    { id: 'acceptance', label: '1. Acceptance & Eligibility', icon: CheckCircle },
    { id: 'accounts', label: '2. User Accounts & Responsibilities', icon: User },
    { id: 'service', label: '3. Service Description & Disclaimers', icon: Shield },
    { id: 'billing', label: '4. Subscription, Payments & Billing', icon: CreditCard },
    { id: 'ip', label: '5. Intellectual Property Rights', icon: Lock },
    { id: 'content', label: '6. User-Generated Content', icon: MessageSquare },
    { id: 'prohibited', label: '7. Prohibited Activities', icon: AlertTriangle },
    { id: 'termination', label: '8. Termination & Suspension', icon: Scale },
    { id: 'dispute', label: '9. Dispute Resolution & Governing Law', icon: FileText },
    { id: 'modifications', label: '10. Modifications to Terms', icon: BookOpen },
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
          <Scale className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3 leading-none">
          Terms of Service
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
              <h4 className="text-xs font-bold text-white">Have a question?</h4>
              <p className="text-[10px] text-gray-400 leading-normal">
                If you have legal or compliance questions regarding our platform terms, contact us.
              </p>
              <Magnetic>
                <a 
                  href="mailto:legal@vantahq.pro"
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-300 text-[10px] font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer w-full justify-center"
                >
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  <span>Email Legal Desk</span>
                </a>
              </Magnetic>
            </div>
          </aside>

          {/* Terms Content Column */}
          <section className="lg:col-span-3 space-y-12 pr-0 lg:pr-4 text-left">
            
            {/* Introductory Disclaimer Callout */}
            <div className="glass-panel border-amber-500/30 bg-amber-500/5 rounded-2xl p-6 shadow-md border flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest">
                  Important Regulatory Notice & Disclaimer
                </h3>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Vanta (vantahq.pro) is an educational, analytical, and workflow management software platform. <strong>Vanta Inc. is NOT a licensed real estate broker, brokerage, agent, financial adviser, or legal counsel.</strong> We do not broker real estate transactions, sell properties, represent buyers/sellers, or offer professional investment advice. All calculations, valuations (such as ARV and MAO), course guides, and AI intelligence audits are tools provided solely for informational and educational purposes. You must perform your own due diligence and obtain licensed legal, tax, and real estate brokerage counsel prior to executing any transaction.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <div id="acceptance" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">1.</span> Acceptance of Terms & Eligibility
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Welcome to Vanta (referred to herein as the <strong>&quot;Service,&quot; &quot;Platform,&quot; &quot;Vanta,&quot; &quot;we,&quot; &quot;us,&quot;</strong> or <strong>&quot;our&quot;</strong>), operated by Vanta Inc. By accessing, browsing, registering for, or using our website located at <Link href="/" className="text-violet-400 font-bold hover:underline">vantahq.pro</Link>, including all features, applications, APIs, database modules, and calculators, you signify that you have read, understood, and agree to be bound by these Terms of Service (<strong>&quot;Terms&quot;</strong>) and our Privacy Policy.
                </p>
                <p>
                  If you are entering into these Terms on behalf of a company, partnership, or other legal entity, you represent and warrant that you have the authority to bind such entity to these Terms. If you do not agree to these Terms or do not meet the eligibility requirements set forth herein, you must immediately cease all access and use of the Service.
                </p>
                <p>
                  <strong>Eligibility:</strong> You must be at least eighteen (18) years of age, and possess the full legal capacity and authority to enter into these Terms, to create an account and use the Platform. By using Vanta, you represent and warrant that you satisfy these age and eligibility requirements, and that your use of the Service does not violate any local state, federal, or international law or regulation applicable to you.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div id="accounts" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">2.</span> User Accounts & Responsibilities
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  To access certain features of the Service—including posting properties to the JV Marketplace, participating in co-wholesaling chats, tracking calculations, and advancing through the Learn Hub progression ranks—you must register and create a user account.
                </p>
                <p>
                  <strong>Account Security:</strong> You are solely responsible for maintaining the strict confidentiality of your login credentials (username and password) and for any and all activity that occurs under your account. You agree to immediately notify Vanta of any unauthorized use of your credentials or any other breach of account security. Vanta will not be liable for any loss or damage arising from your failure to protect your login information.
                </p>
                <p>
                  <strong>Account Accuracy:</strong> You agree to provide true, accurate, current, and complete registration information, and to promptly update such information should it change. You may not impersonate another individual, create an account for anyone other than yourself without authorization, or select a username that is offensive, vulgar, or violates third-party rights.
                </p>
                <p>
                  <strong>Account Limitations:</strong> You may not share your account or transfer access credentials to any third party. Vanta reserves the right, in its sole discretion, to reject registration requests, suspend accounts, or enforce limits on active sessions to prevent credential sharing.
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div id="service" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">3.</span> Service Description & Limitations
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Vanta provides a gamified CRM progression system, real-time collaboration tools, and analysis engines designed for real estate wholesalers and joint venture (JV) partners. Core service modules include:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong>AI Deal Analysis:</strong> Estimators for After Repair Value (ARV) and Maximum Allowable Offer (MAO) inputs.</li>
                  <li><strong>Gamified Learn Hub:</strong> Structured modules with streak-tracking progress to educate users on real estate wholesaling practices.</li>
                  <li><strong>Real-Time JV Chat & Marketplace:</strong> Listing space for active contract opportunities and internal chat services.</li>
                  <li><strong>Voice Notes:</strong> Instant audio recording and transcription capability.</li>
                </ul>
                <p>
                  <strong>Calculations and AI Audits:</strong> The calculators and AI ledger validation modules utilize mathematical formulas and language models based on user inputs. They are intended as quick estimation templates. The outputs do not represent structural appraisals, formal valuations, certified financial statements, or legal contract audits.
                </p>
                <p>
                  <strong>No Brokerage or Advisory Services:</strong> We are not a party to, nor do we facilitate, supervise, or clear transactions listed in the JV Marketplace. Vanta does not receive commissions or transactional compensation from property transactions. All transactions, contract assignments, and negotiations are executed independently between the respective platform users at their own sole risk.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div id="billing" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">4.</span> Subscription, Payments & Billing Terms
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  Vanta offers a Free tier with limited access and a Premium subscription tier requiring recurring fees. By enrolling in a Premium subscription plan, you authorize us to charge your selected payment method (via Stripe or our payment processors) for all applicable fees.
                </p>
                <p>
                  <strong>Billing Cycle:</strong> Subscriptions are billed on a recurring basis according to your chosen period (Monthly, 6-Month, or Yearly) at the start of each billing period. Subscription cycles auto-renew automatically unless cancelled prior to the renewal date.
                </p>
                <p>
                  <strong>Founding Member Rate Protection:</strong> Users who subscribe under the &quot;Founding Member&quot; or &quot;Early Adopter&quot; promotional phases lock in a discounted rate. This rate will remain active for the life of the subscription. <em>Crucial Note:</em> If you cancel your subscription, let the subscription lapse, or if payment fails persistently resulting in account termination, the locked founding rate will be forfeited permanently. Re-subscription will be billed at the standard pricing active at that time.
                </p>
                <p>
                  <strong>Cancellation & Refunds:</strong> You may cancel your subscription at any time within your account dashboard. Cancellation stops the next auto-renewal but does not provide refunds for the current billing cycle. All payments are non-refundable except where explicitly required by law.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div id="ip" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">5.</span> Intellectual Property Rights
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  <strong>Vanta Ownership:</strong> The Platform, including its software architecture, codebases, user interfaces, branding, logos, calculator designs, courses, lessons, gamification structures (such as badges, streak algorithms, and progression ranks), layout, and databases are owned exclusively by Vanta Inc. and are protected by copyright, trademark, trade secret, and other intellectual property laws.
                </p>
                <p>
                  <strong>Limited License:</strong> Subject to your compliance with these Terms, Vanta grants you a limited, non-exclusive, non-transferable, non-sublicensable, and revocable license to access and use the Service for your internal business wholesaling purposes.
                </p>
                <p>
                  <strong>Restrictions:</strong> You may not copy, reverse-engineer, decompile, modify, distribute, sell, lease, scrape, or extract any portion of the platform code, courses, calculators, or datasets without our prior written consent.
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div id="content" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">6.</span> User-Generated Content
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  You retain ownership of any content you upload, post, or submit to the Service, including property listings, calculations, messages in JV chats, testimonials, and profile information (<strong>&quot;User Content&quot;</strong>).
                </p>
                <p>
                  <strong>License Grant:</strong> By posting content on Vanta, you retain ownership of your content. You grant Vanta a non-exclusive, worldwide, royalty-free license to host, store, process, display, and distribute your content solely for the purpose of operating, maintaining, and improving the Platform. This license ends when your content is permanently removed from the Platform, except where retention is required by law or for legitimate business records.
                </p>
                <p>
                  <strong>User Responsibility:</strong> You represent and warrant that you own or have obtained all necessary licenses, contracts, and consents to publish the User Content you submit. You are solely liable for any inaccurate descriptions, false financial statements, or unauthorized property postings. Vanta reserves the right to remove any User Content at any time, with or without notice, if we believe it violates these Terms or applicable law.
                </p>
              </div>
            </div>

            {/* Section 7 */}
            <div id="prohibited" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">7.</span> Prohibited Activities
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  You agree that you will not use the Service to engage in any of the following prohibited behaviors:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-400">
                  <li>
                    <strong>Illegal Listing & Fraud:</strong> Listing properties for wholesaling without a valid, signed, and assignable purchase agreement, or representing yourself as the owner of a property without equitable interest.
                  </li>
                  <li>
                    <strong>Credential Sharing & Scraping:</strong> Accessing the Platform using automated scrapers, spiders, or bots, or sharing Premium credentials to circumvent subscription walls.
                  </li>
                  <li>
                    <strong>Spamming & Harassment:</strong> Sending unsolicited advertisements or commercial solicitation inside the JV Chat, or harassing and insulting other platform members.
                  </li>
                  <li>
                    <strong>System Interference:</strong> Attempting to disrupt, disable, or overburden Vanta servers, or introducing viruses, malware, or Trojans.
                  </li>
                  <li>
                    <strong>Circumvention:</strong> Attempting to reverse-engineer formulas or access courses and calculators outside your subscription tier.
                  </li>
                </ul>
              </div>
            </div>

            {/* Section 8 */}
            <div id="termination" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">8.</span> Termination & Suspension
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  <strong>Termination by Vanta:</strong> We reserve the right to suspend, disable, or terminate your account and platform access, in whole or in part, immediately and without notice, if you breach these Terms, engage in prohibited conduct, or fail to resolve subscription payment failures.
                </p>
                <p>
                  <strong>Termination by User:</strong> You may close your account and cancel your subscription at any time within your account dashboard. Upon cancellation, your Premium access remains active until the end of your current pre-paid cycle, after which your account will revert to the Free tier or terminate.
                </p>
                <p>
                  <strong>Effect of Termination:</strong> Upon termination of your account, your right to use the Platform ceases immediately. All sections of these Terms which by their nature should survive termination shall survive (including disclaimers, intellectual property rights, licenses, governing law, and limitations of liability).
                </p>
              </div>
            </div>

            {/* Section 9 */}
            <div id="dispute" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">9.</span> Dispute Resolution & Governing Law
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  <strong>Governing Law:</strong> These Terms and any action or claim related to your use of the Service shall be governed by and construed in accordance with the laws of the <strong>State of Delaware, United States</strong>, without regard to its conflict of law provisions.
                </p>
                <p>
                  <strong>Binding Arbitration:</strong> Any dispute, controversy, or claim arising out of or relating to these Terms, including the determination of the scope or applicability of this agreement to arbitrate, shall be resolved by binding arbitration in Delaware before a single arbitrator under the rules of the American Arbitration Association (AAA). 
                </p>
                <p>
                  <strong>Class Action Waiver:</strong> You agree that any arbitration or dispute resolution will occur solely on an individual basis. You waive any right to assert claims or participate in class action lawsuits, class-wide arbitrations, or representative actions against Vanta Inc.
                </p>
              </div>
            </div>

            {/* Section 10 */}
            <div id="modifications" className="scroll-mt-24 space-y-4 border-b border-gray-900/60 pb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-violet-500">10.</span> Modifications to Terms
              </h2>
              <div className="text-xs text-gray-300 space-y-3 font-medium leading-relaxed">
                <p>
                  We reserve the right, at our sole discretion, to modify or update these Terms of Service at any time. When we make material changes, we will post the updated Terms on this page and revise the &quot;Last Updated&quot; date at the top of this document.
                </p>
                <p>
                  If you have a Premium subscription, we may also notify you of major updates via the email associated with your account. Your continued use of the Platform following the posting of changes constitutes your full acceptance of the updated Terms. If you do not agree to the modified Terms, you must cancel your subscription and stop using Vanta.
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
                  For any legal inquiries, questions regarding these Terms, or notices of intellectual property infringement, please contact our legal team at:
                </p>
                <div className="glass-panel border-gray-900 rounded-xl p-4 space-y-2 mt-2 w-fit">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="font-bold text-white">Email:</span>
                    <a href="mailto:legal@vantahq.pro" className="text-violet-400 hover:underline">legal@vantahq.pro</a>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-white">Department:</span>
                    <span className="text-gray-400">Legal Compliance Desk</span>
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
            <Link href="/terms" className="text-white border-b border-violet-500/40">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors animated-underline">Privacy Policy</Link>
            <Link href="/login" className="hover:text-white transition-colors animated-underline font-semibold">Sign In</Link>
          </div>
          <p>© 2026 Vanta Inc. All rights reserved. Not a real estate brokerage.</p>
        </div>
      </footer>
    </div>
  )
}
