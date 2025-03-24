# Cordova: Double-sided Scan Sorter

A simple desktop application that solves the problem of jumbled page orders created by double-sided document scanners.

## Problem Statement

Double-sided document scanners often output pages in a non-sequential order due to their scanning mechanism. This application automatically reorders and renames the scanned pages to their correct sequence.

## Features

- Simple, intuitive user interface
- Select any folder containing scanned pages
- Automatic reordering and renaming of files in the correct sequence
- Cross-platform support (Windows, macOS, Linux)

## Usage

1. Launch the application
2. Click the folder selection button
3. Choose the directory containing your scanned pages
4. The application will automatically reorganize the files in the correct order

## Technology

Built with [Tauri](https://tauri.app/) and React, providing a lightweight and efficient desktop application experience.

## Installation

Download the latest release for your operating system from the releases page.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/scanner-page-sorter.git
cd scanner-page-sorter

# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Build for production
bun run tauri build
```

## License

MIT License

## Author

Subhajit Kundu - [https://subhajit.lol](https://subhajit.lol)
