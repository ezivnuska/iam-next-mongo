// app/about/content-sections.ts
// Shared content sections for professional profile

export interface ContentSection {
    title: string;
    paragraphs: string[];
}

export const contentSections: ContentSection[] = [
    {
        title: 'Who is Eric?',
        paragraphs: [
            `I'm a frontend developer with 14 years of professional experience building digital solutions across San Francisco's creative agency landscape. From 2001 to 2015, I worked with leading studios including Illuminotion, Creative Lift, Graphic Language, Pixelette Studios, Eveo, and others, delivering everything from enterprise applications to native mobile apps and rich-media advertising campaigns.`
        ]
    },
    {
        title: 'Professional Experience',
        paragraphs: [
            `My career began at Illuminotion, where I spent five years transforming design composites into fully functional websites with pixel-perfect implementation and cross-browser compatibility. This role taught me the fundamental importance of bridging the gap between creative vision and technical execution—a skill that became central throughout my career.`,
            `At Creative Lift, where I worked for two years, I took on more complex challenges. I maintained and enhanced a sophisticated enterprise Flash application built with the AS3 and PureMVC framework, enabling customers to configure and order customized cable, internet, and telephone service bundles. This experience gave me deep insight into scalable architecture, state management, and building applications that serve real business needs. I also developed the Lift Calculator, a native iOS application for calculating and benchmarking marketing campaign response rates, demonstrating my versatility across platforms.`,
            `At Pixelette Studios, I specialized in architecting expandable and polite-loading rich-media creatives for DoubleClick and MediaMind (now Sizmek) platforms. This work required exceptional attention to performance optimization, ensuring optimal user experience while minimizing page load impact—skills that translate directly to modern web performance concerns.`,
            `Throughout my career at agencies like Graphic Language, Eveo, Attik, and others, I consistently delivered across the full development lifecycle: responsive websites, email marketing campaigns integrated with CMS platforms, interactive microsites optimized for mobile devices, and dynamic content-driven applications using XML and other data sources.`
        ]
    },
    {
        title: 'What I Bring',
        paragraphs: [
            `While the specific technologies have changed, the core skills I developed over 14 years remain highly relevant:`,
            `• Translating Requirements into Reality: Whether it was a complex PureMVC application or a performance-optimized ad creative, I've consistently transformed abstract requirements into polished, functional solutions`,
            `• Attention to Detail: Five years of pixel-perfect implementation at Illuminotion instilled a meticulous approach that extends to all aspects of development`,
            `• Cross-Platform Thinking: Having built for web, iOS, email platforms, and ad networks, I understand how to create solutions that work across different environments and constraints`,
            `• Performance Consciousness: Rich-media development taught me to obsess over load times, file sizes, and optimization—crucial skills for modern web development`,
            `• Adaptability: My career spanned multiple agencies, countless clients, and evolving technologies. I've proven I can quickly understand new contexts and deliver results`,
            `• Deadline Management: Agency work means tight timelines and multiple projects. I've consistently delivered under pressure while maintaining quality standards`
        ]
    },
    {
        title: 'Why the Gap?',
        paragraphs: [
            `I want to be transparent about the gap in my professional timeline. During my most active years, I specialized heavily in ActionScript and Flash development. These were the right tools for the job at the time—Flash enabled rich interactive experiences that weren't possible with the HTML, CSS, and JavaScript capabilities of that era.`,
            `The iPhone's release in 2007 and Apple's decision not to support Flash marked the beginning of a major industry transition, though it took several years for HTML5 and modern JavaScript to fully mature as replacements. By 2015, it was clear that the technology landscape had fundamentally shifted, and my specialization—while valuable for over a decade—required significant retooling.`,
            `Rather than rush into roles where I would struggle with unfamiliar tooling and practices, I made the deliberate choice to properly learn modern web development workflows. This meant understanding module bundlers, transpilers, build processes, contemporary JavaScript patterns, and the frameworks and libraries that had emerged during HTML5's maturation. The development landscape had evolved significantly, and I needed to approach it with the same thoroughness I'd applied to learning ActionScript years earlier.`,
            `An additional challenge was that virtually all of the websites and applications I'd built over 14 years had since been rebuilt or taken offline. This is the nature of web development—sites get redesigned, companies rebrand, businesses close—but it left me without a portfolio to showcase my work. Rebuilding my professional presence meant creating new projects that demonstrate my capabilities with current technologies.`
        ]
    },
    {
        title: `What I'm Looking For`,
        paragraphs: [
            `I'm seeking smaller contract opportunities—either remote or local to the San Francisco Bay Area—where I can contribute meaningfully to projects that matter. I'm specifically interested in individual contributor roles rather than senior or lead positions. This allows me to focus on what I do best: hands-on development work, solving technical challenges, and creating quality user experiences.`,
            `I'm drawn to projects where craftsmanship matters, where there's attention to detail, and where I can continue growing my expertise in modern web technologies while applying the foundational skills I've built over 14 years.`,
            `If you're looking for a developer who brings both extensive experience and a fresh perspective on modern tooling, I'd welcome the opportunity to discuss how I might contribute to your project.`
        ]
    }
];
