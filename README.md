# Picath - Image Gallery & Path Finder

Picath is a powerful Chrome extension that scans the current webpage for images, displays them in a beautiful, filterable gallery, and helps you trace their original source paths.

## Features

- **Image Gallery**: View all images from the page in a responsive grid.
- **Source Path Tracing**: Click any image to see its full source path and open it in a new tab.
- **Smart Filtering**: Filter images by dimensions (width/height) to find exactly what you need.
- **Copy URL**: One-click copy image URLs to your clipboard.
- **Download All**: Download all visible images as a ZIP file.
- **Theme Support**: Toggle between Light and Dark modes.
- **Customizable Grid**: Adjust the thumbnail size to your preference.
- **Zoom on Hover**: Hover over any image to see a larger preview.
- **Hide Images**: Temporarily hide images from the view.
- **Show All Images**: Reset filters and show all images.

## Installation

1.  **Clone the repository** (or download the source code).
2.  Open **Google Chrome**.
3.  Navigate to `chrome://extensions`.
4.  Enable **Developer mode** (toggle switch in the top-right corner).
5.  Click **Load unpacked**.
6.  Select the folder containing the extension files.

## Usage

1.  Click the **Picath** icon in your browser toolbar.
2.  The extension will scan the current page and display all images.
3.  Use the **filter** inputs to narrow down images by dimensions.
4.  Click the **Copy** button on any card to copy the image URL.
5.  Click the **Hide** button to remove an image from the view.
6.  Click **Show All Images** to reset filters.
7.  Use the **Settings** (gear icon) to adjust the grid size, toggle themes, and manage badge visibility.

## File Structure

- `manifest.json`: Extension configuration.
- `gallery.html`: The main UI for the popup.
- `gallery.js`: Handles logic for scanning, filtering, and rendering images.
- `gallery.css`: Styles for the gallery interface.
- `background.js`: Service worker for browser actions.
- `icon*.png`: Extension icons.
