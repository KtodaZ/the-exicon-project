# The Exicon Project

**An open source exercise lexicon for F3 Qs — built by the PAX, for the PAX.**

The Exicon Project is a community-driven effort to build, refine, and maintain an up-to-date exercise lexicon (Exicon) for F3 workouts.
This project provides a platform for Qs across regions to contribute new routines, update existing entries, and share the creative fitness traditions of the F3 Nation.

---

## 📚 What is the Exicon?

The Exicon is a collection of named exercises used in F3 workouts, often paired with a unique story, method, or tradition. It helps Qs (leaders) bring consistency, creativity, and fun to beatdowns while honoring F3's culture and mission.

You can view the official Exicon at [f3nation.com/Exicon](https://f3nation.com/Exicon).

This project aims to build an open, extensible version of that resource.

## 🤝 Contributing

We welcome contributions of all kinds!

Start with the CONTRIBUTING.md guide to learn how to get involved.

## ⚖️ Disclaimer

Use of this resource is entirely voluntary and at your own risk.

Please read our full DISCLAIMER.md before participating in or performing any exercises described in this project.

## 📄 License

This project is licensed under the MIT License.

## Packages

### Exicon Fetcher

A utility package that fetches and stores exercise lexicon (Exicon) data from the F3 Nation API. The package handles:

- Fetching the complete list of exercises (~780 items)
- Retrieving detailed information for each exercise
- Extracting video URLs from the content
- Storing the data locally for further processing

To use:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the fetcher
cd packages/exicon-fetcher && pnpm fetch
```

This will create a `data` directory with summaries, details, and extracted video URLs for all exercises in the F3 Exicon.
