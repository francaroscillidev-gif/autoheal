# Contributing to AutoHeal Agent 🛡️

First off, thank you for considering contributing to **AutoHeal**! It's people like you that make AutoHeal a powerful, resilient, and enterprise-grade autonomous testing ecosystem.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our standards of respectful, collaborative, and inclusive communication.

---

## 🛠️ Local Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/francaroscillidev-gif/autoheal.git
   cd autoheal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

4. **Build TypeScript in watch mode:**
   ```bash
   npm run build
   ```

5. **Run test suite:**
   ```bash
   npm test
   ```

6. **Run the autonomous health check:**
   ```bash
   node dist/cli.js doctor
   ```

---

## 🌿 Branching & Pull Request Guidelines

- Branch naming: `feat/feature-name`, `fix/bug-name`, `docs/improvement-name`
- Ensure all Playwright tests pass before submitting a PR: `npm test`
- Make sure TypeScript compiles without errors: `npm run build`
- All code changes should include relevant unit/e2e test coverage.

---

## 📬 Contact & Maintainer

For questions, enterprise integrations, or security discussions:
- **Lead Maintainer:** Franca Roscilli
- **Email:** [francaroscillidev@gmail.com](mailto:francaroscillidev@gmail.com)
- **GitHub:** [@francaroscillidev-gif](https://github.com/francaroscillidev-gif)

Thank you for helping us shape the future of autonomous test engineering! 🚀
