// Projects — content grounded in the real repositories (README, package.json,
// screenshots). No invented metrics, users, stars or deployment claims.
// Only Smart Quiz has a verified live demo URL.

export const featuredProjects = [
  {
    slug: "smart-quiz",
    name: "Smart Quiz",
    tagline: "AI-powered MERN quiz platform",
    category: "Full-Stack · AI",
    year: "2025",
    accent: "#818cf8",
    cover: "/projects/smart-quiz/home-page.png",
    repo: "https://github.com/harshitraj7304/smartquiz",
    live: "https://smartquiz-pi.vercel.app",
    stack: [
      "React",
      "Vite",
      "Tailwind CSS",
      "shadcn/ui",
      "Framer Motion",
      "Node.js",
      "Express.js",
      "MongoDB",
      "JWT",
      "Chart.js",
    ],
    description:
      "A full-stack platform where users generate quizzes with AI or build them manually, attempt them in practice or test mode, and track performance through analytics dashboards.",
    features: [
      "AI-assisted quiz generation",
      "Manual quiz builder with rich config",
      "Practice & test modes",
      "Dashboard analytics",
      "JWT auth & role-based routes",
      "Quiz feed with search & filter",
    ],
    // ---- Case-study content ----
    overview:
      "SmartQuiz is a full-stack MERN application for learners and educators to create, share and attempt quizzes — with AI-assisted question generation, performance analytics and a modern, component-driven UI. Users can author quizzes by hand or let AI generate them, then take them in a focused practice or timed test mode.",
    problem:
      "Most quiz tools are either rigid — fixed banks of questions — or tedious to author from scratch. They also tend to stop at a final score, offering little insight into how someone is actually improving over time.",
    solution:
      "A platform that supports both AI-generated and manually authored quizzes, with fully configurable parameters (title, description, number of questions, category, difficulty, time limit and passing score). Attempts run in practice or test mode, results are processed into scores, and dashboards surface progress over time. Authentication protects user data and an admin view supports management.",
    featuresLong: [
      "AI quiz generation from a topic, alongside a full manual quiz builder",
      "Quiz configuration: title, description, question count, category, difficulty, time limit and passing score",
      "Practice mode and timed test mode with automatic result processing",
      "Analytics dashboard with performance tracking (Chart.js)",
      'Quiz feed with search & filtering, plus "My Quizzes" management',
      "Login / signup with JWT authentication and role-based protected routes",
      "User profile, feedback system and admin functionality",
      "Fully responsive UI built with shadcn/ui, Tailwind and Framer Motion",
    ],
    architecture:
      "A component-based React frontend (Vite) styled with Tailwind + shadcn/ui and animated with Framer Motion, talking to a modular Node/Express REST API via Axios. MongoDB handles persistence; JWT secures authentication with role-based protected routes; Chart.js renders the analytics. The frontend is deployed on Vercel with the API hosted on Render.",
    challenges:
      "Designing a flexible quiz schema that cleanly supports both AI-generated and hand-authored questions, keeping the AI generation flow responsive without blocking the UI, and enforcing consistent role-based access across protected routes.",
    learnings:
      "Hands-on experience wiring a complete MERN architecture end to end, integrating an AI API into a real product flow, implementing JWT auth patterns, and structuring a REST API to stay maintainable as features grew.",
    screenshots: [
      {
        src: "/projects/smart-quiz/home-page.png",
        alt: "Smart Quiz landing page",
      },
      { src: "/projects/smart-quiz/dashboard.png", alt: "Analytics dashboard" },
      {
        src: "/projects/smart-quiz/create-quiz.png",
        alt: "Create quiz screen",
      },
      {
        src: "/projects/smart-quiz/quiz-feed.png",
        alt: "Quiz feed with search and filters",
      },
      {
        src: "/projects/smart-quiz/my-quizzes.png",
        alt: "My Quizzes management view",
      },
      { src: "/projects/smart-quiz/profile.png", alt: "User profile page" },
      { src: "/projects/smart-quiz/feedback.png", alt: "Feedback page" },
      {
        src: "/projects/smart-quiz/service-page.png",
        alt: "Services / features page",
      },
    ],
  },

  {
    slug: "smart-expense-manager",
    name: "Smart Expense Manager",
    tagline: "Full-stack personal finance tracker",
    category: "Full-Stack · Finance · AI",
    year: "2025",
    accent: "#34d399",
    cover: "/projects/smart-expense-manager/landing-page.png",
    repo: "https://github.com/harshitraj7304/smart_expense_manager-main",
    live: null,
    stack: [
      "React",
      "Tailwind CSS",
      "Chart.js",
      "Axios",
      "React Router",
      "Node.js",
      "Express.js",
      "MongoDB",
      "JWT",
    ],
    description:
      "A MERN finance app for tracking income and expenses, with analytics dashboards, category management, reports, an AI assistant for insights, and a recycle-bin for restoring deleted entries.",
    features: [
      "Income & expense CRUD",
      "Dashboard analytics",
      "AI assistant (Aliza)",
      "Reports & weekly insights",
      "Categories & payment methods",
      "Recycle bin (restore deleted)",
    ],
    overview:
      "Expense Mate is a full-stack MERN finance application that helps users manage day-to-day spending. It combines fast expense entry with analytics dashboards, category and payment-method tracking, reports, and an AI assistant that offers spending insights — wrapped in a clean, responsive interface.",
    problem:
      "Personal spending is easy to lose track of. People need a quick way to log transactions, see where money actually goes, recover mistakes, and get simple, understandable insights — without a heavyweight accounting tool.",
    solution:
      "A finance tracker with full CRUD over income and expense entries, real-time balance updates, category and payment-method organisation, weekly trend reports, and an AI assistant (“Aliza”) for smart insights. A recycle-bin system allows deleted expenses to be restored, and search/filters make records easy to navigate.",
    featuresLong: [
      "Full CRUD for income and expense entries with real-time balance updates",
      "Dashboard analytics and weekly expense insights (Chart.js)",
      "Expense categories and payment-method tracking",
      "AI assistant (“Aliza”) for spending insights",
      "Reports & statistics views",
      "Recycle-bin system to restore soft-deleted expenses",
      "Search & filtering across records",
      "Authentication with JWT and a responsive, modern dashboard UI",
    ],
    architecture:
      "A React frontend (Tailwind + Chart.js) consuming a Node/Express REST API through Axios, with MongoDB for persistence and JWT-based authentication. The UI is organised around a dashboard shell with modular views for entries, categories, reports, the AI assistant and the recycle bin.",
    challenges:
      "Keeping balances and analytics consistent as entries are added, edited, soft-deleted and restored, and designing a category/payment-method model flexible enough for real spending patterns.",
    learnings:
      "Modelling financial data and soft-deletes in MongoDB, building analytics views with Chart.js, and integrating an assistant flow into a practical, everyday product.",
    screenshots: [
      {
        src: "/projects/smart-expense-manager/landing-page.png",
        alt: "Expense Mate landing page",
      },
      {
        src: "/projects/smart-expense-manager/home.png",
        alt: "Dashboard home",
      },
      {
        src: "/projects/smart-expense-manager/add-expense.png",
        alt: "Add expense form",
      },
      {
        src: "/projects/smart-expense-manager/assistant.png",
        alt: "AI assistant (Aliza)",
      },
      {
        src: "/projects/smart-expense-manager/categories.png",
        alt: "Expense categories",
      },
      {
        src: "/projects/smart-expense-manager/reports.png",
        alt: "Reports and statistics",
      },
      {
        src: "/projects/smart-expense-manager/view-expense.png",
        alt: "Expense detail view",
      },
      {
        src: "/projects/smart-expense-manager/recycle-bin.png",
        alt: "Recycle bin for deleted expenses",
      },
    ],
  },

  {
    slug: "electro-mart",
    name: "Electro Mart",
    tagline: "Java Swing + MySQL shop management system",
    category: "Java · Desktop App",
    year: "2025",
    accent: "#f59e0b",
    cover: "/projects/electro-mart/home.png",
    repo: "https://github.com/harshitraj7304/electro-mart-java",
    live: null,
    stack: ["Java", "Java Swing", "AWT", "MySQL", "JDBC", "NetBeans"],
    description:
      "A Java Swing + MySQL desktop application for running an electronics shop — admin authentication, product & category management, cart, billing, inventory and sales reports.",
    features: [
      "Admin login authentication",
      "Product management (CRUD)",
      "Category management",
      "Cart & billing module",
      "Sales & profit reports",
      "MySQL-backed inventory",
    ],
    overview:
      "Electro Mart is a desktop application built with Java Swing and MySQL for managing an electronic-products shop. It provides a complete admin workflow: secure login, product and category management, product search, a cart-and-billing module, inventory tracking and sales/profit reporting — all backed by a MySQL database via JDBC.",
    problem:
      "Small electronics retailers need a simple in-store system to manage products, generate bills and keep an eye on inventory and profit — without depending on a web connection or a complex point-of-sale suite.",
    solution:
      "A standalone Java desktop application with a user-friendly Swing GUI. An admin logs in, manages products and categories, searches the catalogue, adds items to a cart, generates bills, and reviews sales and profit reports, with all data persisted in MySQL.",
    featuresLong: [
      "Secure admin login authentication",
      "Add, update, delete and search products",
      "Product category management",
      "Add-to-cart and remove-from-cart operations",
      "Billing & selling module with total calculation",
      "Sales and profit reports",
      "Inventory management with MySQL persistence",
      "User-friendly Java Swing / AWT interface",
    ],
    architecture:
      "A Java Swing / AWT front end organised into modules (login, product, category, cart & billing, reports, about), connected to a MySQL database through JDBC for persistent inventory, admin and category data. Built and structured as a NetBeans project.",
    challenges:
      "Managing state across multiple Swing windows and forms, keeping the UI responsive during database operations, and structuring JDBC access so the modules stay decoupled from the persistence layer.",
    learnings:
      "Core Java and event-driven Swing UI development, relational schema design in MySQL, and connecting a desktop application to a database with JDBC through a clean modular structure.",
    screenshots: [
      {
        src: "/projects/electro-mart/home.png",
        alt: "Electro Mart home dashboard",
      },
      { src: "/projects/electro-mart/login.png", alt: "Admin login screen" },
      { src: "/projects/electro-mart/home-menu1.png", alt: "Home menu" },
      {
        src: "/projects/electro-mart/category.png",
        alt: "Category management",
      },
      {
        src: "/projects/electro-mart/searchproduct.png",
        alt: "Product search",
      },
      { src: "/projects/electro-mart/report.png", alt: "Sales report" },
      {
        src: "/projects/electro-mart/db-product.png",
        alt: "MySQL product table",
      },
      { src: "/projects/electro-mart/about.png", alt: "About screen" },
    ],
  },

  {
    slug: "myntra-clone",
    name: "Myntra Clone",
    tagline: "Responsive fashion e-commerce UI",
    category: "Frontend · E-Commerce",
    year: "2025",
    accent: "#fb7185",
    cover: "/projects/myntra-clone/home.png",
    repo: "https://github.com/harshitraj7304/myntra-clone",
    live: null,
    disclaimer:
      "An educational, Myntra-inspired UI clone — not affiliated with or endorsed by Myntra.",
    stack: [
      "React",
      "Vite",
      "Tailwind CSS",
      "React Router",
      "JavaScript",
      "LocalStorage",
    ],
    description:
      "A responsive Myntra-inspired fashion e-commerce interface with category browsing, wishlist, cart, coupon discounts and an order flow — built with a clean, component-driven React architecture.",
    features: [
      "Category browsing (Men/Women/Kids/Beauty)",
      "Product cards with ratings & discounts",
      "Wishlist & shopping cart",
      "Coupon / discount system",
      "Order placement flow",
      "Filter, sort & responsive layout",
    ],
    overview:
      "A Myntra-inspired fashion e-commerce front end built with React, Vite and Tailwind CSS. It recreates the core shopping experience — browsing categories, exploring product cards with ratings and discounts, managing a wishlist and cart, applying coupons, and completing an order — with multi-page routing and a fully responsive layout.",
    problem:
      "Recreating a polished, real-world e-commerce experience is a strong test of front-end skill: product-heavy layouts, stateful cart/wishlist logic, filtering, and responsiveness all have to work together smoothly.",
    solution:
      "A component-driven React app with dynamic product rendering, category pages for Men, Women, Kids and Beauty, wishlist and cart state persisted in LocalStorage, a coupon/discount system and an order-placement page — navigated through React Router and styled to feel close to the real thing across devices.",
    featuresLong: [
      "Category browsing for Men, Women, Kids and Beauty",
      "Dynamic product rendering with product cards, ratings and discounts",
      "Wishlist functionality and a full shopping-cart system",
      "Coupon / discount system",
      "Order placement page",
      "Filtering and sorting options",
      "Responsive navbar, hero sections and layouts",
      "LocalStorage persistence for cart and wishlist",
    ],
    architecture:
      "A React 19 + Vite single-page app with React Router handling multi-page navigation and Tailwind CSS for styling. Product data is rendered dynamically into reusable card components; cart and wishlist state is persisted in LocalStorage so it survives reloads.",
    challenges:
      "Managing cart, wishlist and coupon state consistently across routes, and keeping the product-dense layouts clean and responsive from mobile up to desktop.",
    learnings:
      "Component-driven UI architecture, client-side routing with React Router, managing persistent UI state, and building responsive, content-heavy e-commerce layouts.",
    screenshots: [
      { src: "/projects/myntra-clone/home.png", alt: "Myntra clone home page" },
      { src: "/projects/myntra-clone/women.png", alt: "Women collection" },
      { src: "/projects/myntra-clone/mens.png", alt: "Men's collection" },
      { src: "/projects/myntra-clone/kids.png", alt: "Kids collection" },
      { src: "/projects/myntra-clone/beauty.png", alt: "Beauty section" },
      { src: "/projects/myntra-clone/featured.png", alt: "Featured products" },
      { src: "/projects/myntra-clone/wishlist.png", alt: "Wishlist page" },
      { src: "/projects/myntra-clone/bag.png", alt: "Shopping bag" },
    ],
  },
];

// Secondary projects — real repositories, linked to GitHub.
export const otherProjects = [
  {
    name: "AI Chatbot",
    description:
      "A Java 17 desktop assistant with Gemini AI, document analysis, Markdown support and saved conversations.",
    tech: ["Java 17", "Gemini API", "RAG", "Swing", "FlatLaf"],
    icon: "Bot",
    repo: "https://github.com/harshitraj7304/CodeAlpha_AIChatbot",
  },
  {
    name: "Stock Trading Platform",
    description:
      "A Java application for managing stock market buying, selling and portfolio workflows.",
    tech: ["Java", "OOP", "Stock Trading"],
    icon: "Briefcase",
    repo: "https://github.com/harshitraj7304/CodeAlpha_StockTradingPlatform",
  },
  {
    name: "Student Grade Tracker",
    description:
      "A Java Swing and Maven app for tracking student grades and organizing academic results.",
    tech: ["Java", "Swing", "Maven"],
    icon: "GraduationCap",
    repo: "https://github.com/harshitraj7304/CodeAlpha_StudentGradeTracker",
  },
  {
    name: "LeadHub CRM",
    description:
      "A production-ready Lead Management CRM built for a full-stack development qualification task.",
    tech: ["React", "Node.js", "MongoDB"],
    icon: "Users",
    repo: "https://github.com/harshitraj7304/leadflow-crm",
  },
  {
    name: "Vidyora School OS",
    description:
      "A multi-school ERP and LMS platform with a modular front-end architecture.",
    tech: ["React", "JavaScript", "ERP/LMS"],
    icon: "GraduationCap",
    repo: "https://github.com/harshitraj7304/vidyora-school-os",
  },
  {
    name: "Resume Generator",
    description:
      "A professional resume generator that builds clean, formatted resumes in the browser.",
    tech: ["React", "JavaScript"],
    icon: "FileText",
    repo: "https://github.com/harshitraj7304/resume-generator",
  },
  {
    name: "Maa Medical Store",
    description:
      "A modern medical e-commerce web app for browsing and ordering pharmacy products.",
    tech: ["React", "Tailwind CSS"],
    icon: "Cross",
    repo: "https://github.com/harshitraj7304/maa-medical-store",
  },
  {
    name: "Weather App",
    description:
      "A modern weather application with live data from a weather API.",
    tech: ["React", "Weather API"],
    icon: "CloudSun",
    repo: "https://github.com/harshitraj7304/weather-app",
  },
  {
    name: "Book Store",
    description:
      "A modern book store website with a clean, responsive catalogue UI.",
    tech: ["React", "JavaScript"],
    icon: "BookOpen",
    repo: "https://github.com/harshitraj7304/book-store-website",
  },
  {
    name: "JAM — Jobs At Mail",
    description:
      "A job-portal web application for posting and browsing job listings.",
    tech: ["Python", "Django"],
    icon: "Briefcase",
    repo: "https://github.com/harshitraj7304/jam-ui",
  },
  {
    name: "Online Shopping System",
    description:
      "An online shopping system for selling products, built with Django.",
    tech: ["Python", "Django"],
    icon: "ShoppingCart",
    repo: "https://github.com/harshitraj7304/online-shopping-system",
  },
  {
    name: "Registration Form UI",
    description:
      "A responsive, validated registration form built with core web technologies.",
    tech: ["HTML", "CSS", "JavaScript"],
    icon: "ClipboardList",
    repo: "https://github.com/harshitraj7304/registration-form-ui",
  },
];

export function getProjectBySlug(slug) {
  return featuredProjects.find((p) => p.slug === slug);
}
