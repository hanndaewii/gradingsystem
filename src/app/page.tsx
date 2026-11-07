'use client';

import {
  CheckCircle,
  Zap,
  Shield,
  BarChart,
  Users,
  FileText,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Cpu,
  Lock,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: Zap,
    title: 'Automated Grading',
    description: 'AI-powered assessment engine reduces grading time by 80% while maintaining accuracy and consistency across all submissions.',
  },
  {
    icon: BarChart,
    title: 'Real-time Analytics',
    description: 'Comprehensive dashboards with live performance metrics, trend analysis, and predictive insights for educators and administrators.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption, role-based access control, and audit trails for complete data protection.',
  },
  {
    icon: Users,
    title: 'Collaborative Workflows',
    description: 'Multi-reviewer support with consensus scoring, annotation tools, and seamless integration with existing LMS platforms.',
  },
  {
    icon: FileText,
    title: 'Automated Reports',
    description: 'Generate professional PDF reports with customizable templates, branding, and distribution workflows in seconds.',
  },
  {
    icon: GraduationCap,
    title: 'Rubric Management',
    description: 'Flexible rubric builder with weighted criteria, reusable templates, and version control for consistent evaluation standards.',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '50K+', label: 'Assessments Processed' },
  { value: '200+', label: 'Active Institutions' },
  { value: '40h', label: 'Time Saved Weekly' },
];

const testimonials = [
  {
    quote: 'The electronic grading system transformed our evaluation process. What used to take weeks now takes hours, with better consistency.',
    author: 'Dr. Sarah Chen',
    role: 'Director of Assessment, State University',
    avatar: 'SC',
  },
  {
    quote: 'The analytics dashboard gives us insights we never had before. We can identify struggling students weeks earlier.',
    author: 'Prof. James Rodriguez',
    role: 'Department Chair, Technical Institute',
    avatar: 'JR',
  },
  {
    quote: 'Security and compliance were our top concerns. This platform exceeds our institutional requirements while remaining intuitive.',
    author: 'Maria Kowalski',
    role: 'IT Director, Community College System',
    avatar: 'MK',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-text-primary">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-sticky bg-bg-primary/80 backdrop-blur-md border-b border-border-primary">
        <nav className="container flex items-center justify-between h-16 equal-edges" aria-label="Main navigation">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-soft bg-brand-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-text-inverse" aria-hidden="true" />
            </div>
            <span className="font-display font-semibold text-heading-sm text-text-primary">CWPC BAD</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors duration-fast">Features</Link>
            <Link href="#how-it-works" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors duration-fast">How It Works</Link>
            <Link href="#testimonials" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors duration-fast">Testimonials</Link>
            <Link href="#pricing" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors duration-fast">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block btn btn-ghost btn-sm"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn btn-primary btn-sm"
            >
              Get Started
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section - One screen */}
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center section-spacing equal-edges" aria-labelledby="hero-heading">
          <div className="container max-w-5xl">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-status-success-bg text-status-success text-caption font-medium mb-6 animate-fade-in">
                <Cpu className="w-4 h-4" aria-hidden="true" />
                <span>Now with AI-assisted grading — 3x faster</span>
              </div>

              <h1 id="hero-heading" className="text-display-xl md:text-display-lg font-bold text-text-primary mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                Electronic Grading System
                <br />
                <span className="text-brand-primary">Built for CWPC BAD</span>
              </h1>

              <p className="text-body-lg md:text-heading-sm text-text-secondary mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
                Streamline assessment workflows with AI-powered grading, real-time analytics, and enterprise-grade security. Trusted by 200+ institutions worldwide.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <Link
                  href="/register"
                  className="btn btn-primary btn-lg w-full sm:w-auto"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
                <Link
                  href="#demo"
                  className="btn btn-secondary btn-lg w-full sm:w-auto"
                >
                  Watch Demo
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-text-tertiary animate-fade-in" style={{ animationDelay: '400ms' }}>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-status-success" aria-hidden="true" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-status-success" aria-hidden="true" />
                  14-day free trial
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-status-success" aria-hidden="true" />
                  Cancel anytime
                </span>
              </div>
            </div>

            {/* Hero Visual - Product Screenshot Placeholder */}
            <div className="mt-16 relative animate-scale-in" style={{ animationDelay: '500ms' }}>
              <div className="aspect-[16/10] rounded-xl border border-border-primary bg-bg-secondary shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-brand-primary/20 flex items-center justify-center">
                      <BarChart className="w-12 h-12 text-brand-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-heading-md text-text-primary mb-2">Dashboard Preview</h3>
                    <p className="text-text-secondary">Real-time grading analytics and insights</p>
                  </div>
                </div>
                {/* Decorative grid overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} aria-hidden="true" />
              </div>
              {/* Floating stat cards */}
              <div className="absolute -bottom-6 -left-6 md:-left-12">
                <div className="card p-4 md:p-6 min-w-[200px] shadow-xl animate-slide-up" style={{ animationDelay: '600ms' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-soft bg-status-success-bg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-status-success" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-display-sm font-bold text-text-primary">99.9%</p>
                      <p className="text-caption text-text-secondary">Grading Accuracy</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 md:-right-12">
                <div className="card p-4 md:p-6 min-w-[200px] shadow-xl animate-slide-up" style={{ animationDelay: '700ms' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-soft bg-brand-primary/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-display-sm font-bold text-text-primary">80%</p>
                      <p className="text-caption text-text-secondary">Time Reduction</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="section-spacing border-y border-border-primary bg-bg-secondary equal-edges" aria-label="Trusted by">
          <div className="container">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
              <span className="font-display font-semibold text-heading-sm text-text-primary">Trusted by leading institutions</span>
              <div className="flex flex-wrap items-center justify-center gap-8 text-text-tertiary">
                <span className="font-medium">State University</span>
                <span className="font-medium">Technical Institute</span>
                <span className="font-medium">Community College System</span>
                <span className="font-medium">Medical Academy</span>
                <span className="font-medium">Research Foundation</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="stats" className="section-spacing equal-edges" aria-labelledby="stats-heading">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="stats-heading" className="text-display-md font-bold text-text-primary mb-4">
                Results That Matter
              </h2>
              <p className="text-body-lg text-text-secondary">
                Measurable impact across institutions of all sizes
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="card p-6 md:p-8 text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <p className="text-display-lg md:text-display-xl font-bold text-brand-primary mb-2">
                    {stat.value}
                  </p>
                  <p className="text-body-sm text-text-secondary font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section-spacing equal-edges" aria-labelledby="features-heading">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="features-heading" className="text-display-md font-bold text-text-primary mb-4">
                Everything You Need for Modern Assessment
              </h2>
              <p className="text-body-lg text-text-secondary">
                Comprehensive features designed for educators, administrators, and students
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="card p-6 md:p-8 hover:shadow-lg transition-all duration-normal group animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-soft bg-brand-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-normal">
                    <feature.icon className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-heading-md font-semibold text-text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-body text-text-secondary">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="section-spacing equal-edges bg-bg-secondary" aria-labelledby="how-heading">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="how-heading" className="text-display-md font-bold text-text-primary mb-4">
                Simple Three-Step Process
              </h2>
              <p className="text-body-lg text-text-secondary">
                From setup to insights in minutes, not weeks
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  title: 'Import & Configure',
                  description: 'Upload rubrics, import student rosters via CSV or LMS integration, and configure grading parameters in minutes.',
                  icon: FileText,
                },
                {
                  step: '02',
                  title: 'Automated Grading',
                  description: 'AI engine evaluates submissions against rubrics with human-in-the-loop review for edge cases and quality assurance.',
                  icon: Cpu,
                },
                {
                  step: '03',
                  title: 'Analyze & Report',
                  description: 'Real-time dashboards, automated PDF reports, and exportable data for accreditation and institutional research.',
                  icon: BarChart,
                },
              ].map((step, index) => (
                <div
                  key={step.step}
                  className="relative text-center animate-slide-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <span className="text-display-sm font-bold text-brand-primary">{step.step}</span>
                  </div>
                  <div className="w-12 h-12 mx-auto mb-6 rounded-soft bg-brand-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-heading-lg font-semibold text-text-primary mb-3">
                    {step.title}
                  </h3>
                  <p className="text-body text-text-secondary">
                    {step.description}
                  </p>
                  {/* Connecting line */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-brand-primary/30 to-transparent" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="section-spacing equal-edges" aria-labelledby="testimonials-heading">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="testimonials-heading" className="text-display-md font-bold text-text-primary mb-4">
                Trusted by Educators Worldwide
              </h2>
              <p className="text-body-lg text-text-secondary">
                See what institutions are saying about their grading transformation
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <article
                  key={testimonial.author}
                  className="card p-6 md:p-8 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex gap-1 mb-6" aria-label="5 star rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <CheckCircle key={star} className="w-5 h-5 text-amber-500" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="text-body text-text-secondary mb-6 italic leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-semibold text-heading-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{testimonial.author}</p>
                      <p className="text-body-sm text-text-tertiary">{testimonial.role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Compliance Section */}
        <section id="security" className="section-spacing equal-edges bg-bg-secondary" aria-labelledby="security-heading">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 id="security-heading" className="text-display-md font-bold text-text-primary mb-4">
                  Enterprise-Grade Security & Compliance
                </h2>
                <p className="text-body-lg text-text-secondary">
                  Built for institutions with strict data protection requirements
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Lock, title: 'SOC 2 Type II Certified', description: 'Annual independent audits ensuring security, availability, and confidentiality controls.' },
                  { icon: Shield, title: 'End-to-End Encryption', description: 'AES-256 encryption at rest and TLS 1.3 in transit for all data.' },
                  { icon: Users, title: 'Role-Based Access Control', description: 'Granular permissions for administrators, instructors, reviewers, and students.' },
                  { icon: Globe, title: 'FERPA & GDPR Compliant', description: 'Built-in privacy controls, data portability, and right-to-deletion workflows.' },
                  { icon: FileText, title: 'Audit Trails', description: 'Comprehensive logging of all grading actions, access, and modifications.' },
                  { icon: Cpu, title: 'On-Premise Option', description: 'Deploy in your private cloud or data center for maximum data sovereignty.' },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className="card p-6 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-soft bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-heading-sm font-semibold text-text-primary mb-1">{item.title}</h3>
                        <p className="text-body-sm text-text-secondary">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="section-spacing equal-edges" aria-labelledby="cta-heading">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="card p-8 md:p-12 bg-gradient-to-br from-brand-primary to-brand-primary-hover relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 36v-4H0v4H0v2h4v4h2v-4h4v-2H6zM6 6V0H4v2H0v4h2v4h2V6h2V4H6V2zm-4 28v-4H0v4H0v2h4v4h2v-4h4v-2H6zM36 6v-4h-2V0h-4v2h4v4h2V6h4V4h-4zM0 36v-4H0v2h4v4h2v-4h4v-2H6V34H2v4H0zm30 0v-4h-2v2h-4v4h2v-4h4v-2h-4zm4-30v4h2V6h4V4h-4V0h-2v4h-4v2h4z\' fill=\'%23ffffff\' fill-opacity=\'0.1\'/%3E%3C/g%3E%3C/svg%3E")',
                }} aria-hidden="true" />
                <div className="relative z-10">
                  <h2 id="cta-heading" className="text-display-md font-bold text-text-inverse mb-4">
                    Ready to Transform Your Grading Process?
                  </h2>
                  <p className="text-body-lg text-brand-primary/90 mb-8 max-w-xl mx-auto">
                    Join 200+ institutions saving 40+ hours per week on assessment workflows.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/register"
                      className="btn btn-lg w-full sm:w-auto bg-text-inverse text-brand-primary hover:bg-text-inverse/90"
                    >
                      Start Free 14-Day Trial
                      <ArrowRight className="w-5 h-5" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/contact"
                      className="btn btn-lg w-full sm:w-auto border-2 border-text-inverse/30 text-text-inverse hover:border-text-inverse hover:bg-text-inverse/10"
                    >
                      Contact Sales
                    </Link>
                  </div>
                  <p className="mt-6 text-caption text-brand-primary/70">
                    No credit card required · Cancel anytime · SOC 2 certified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-bg-inverse text-text-inverse border-t border-white/10" role="contentinfo">
        <div className="container section-spacing equal-edges">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-soft bg-brand-primary flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-text-inverse" aria-hidden="true" />
                </div>
                <span className="font-display font-semibold text-heading-sm">CWPC BAD</span>
              </div>
              <p className="text-body text-brand-primary/70 max-w-xs mb-6">
                Professional electronic grading system for modern education. Streamlined assessment, automated reporting, and comprehensive analytics.
              </p>
              <div className="flex gap-4">
                <a href="https://twitter.com/cwpcbad" className="text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24h-3.304l-7.124-8.184-7.126 8.184h-3.304l8.502-9.24zM12 17.42l7.124-8.184h-3.304l-7.124 8.184z"/></svg>
                </a>
                <a href="https://github.com/cwpcbad" className="text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast" aria-label="GitHub">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="https://linkedin.com/company/cwpcbad" className="text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>

            <nav aria-label="Product">
              <h4 className="font-semibold text-body-sm mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="#features" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Features</Link></li>
                <li><Link href="#pricing" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Pricing</Link></li>
                <li><Link href="/integrations" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Integrations</Link></li>
                <li><Link href="/api-docs" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">API Docs</Link></li>
                <li><Link href="/changelog" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Changelog</Link></li>
              </ul>
            </nav>

            <nav aria-label="Company">
              <h4 className="font-semibold text-body-sm mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">About</Link></li>
                <li><Link href="/blog" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Blog</Link></li>
                <li><Link href="/careers" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Careers</Link></li>
                <li><Link href="/press" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Press</Link></li>
                <li><Link href="/contact" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Contact</Link></li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h4 className="font-semibold text-body-sm mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/help" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Help Center</Link></li>
                <li><Link href="/community" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Community</Link></li>
                <li><Link href="/webinars" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Webinars</Link></li>
                <li><Link href="/case-studies" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Case Studies</Link></li>
                <li><Link href="/security" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Security</Link></li>
              </ul>
            </nav>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-brand-primary/50">
              © {new Date().getFullYear()} CWPC BAD. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Privacy Policy</Link>
              <Link href="/terms" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Terms of Service</Link>
              <Link href="/cookies" className="text-body-sm text-brand-primary/70 hover:text-text-inverse transition-colors duration-fast">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}