# 🕐 WhatAreYouDoing

> **Track your time. Block distractions. Take control of your digital life.**

A privacy-focused Chrome extension that helps you understand your browsing habits and boost productivity through intelligent time tracking and customizable website blocking.

---

## ✨ Features

### 📊 **Time Tracking**

- **Real-time monitoring** of time spent on websites
- **Badge display** showing current session time
- **Daily and total statistics** with detailed breakdowns
- **Session counting** to track how often you visit sites

### 🚫 **Website Blocking**

- **Customizable time limits** - Set daily limits for distracting sites
- **Scheduled blocking** - Block sites during specific hours
- **Flexible controls** - Enable/disable blocking as needed
- **Smart notifications** - Get warned before limits are reached

### 📈 **Analytics & Insights**

- **Interactive pie charts** showing your top visited sites
- **Sorting options** - Sort by time spent or session count
- **Pagination support** for large datasets
- **Export capabilities** for your data

### 🔒 **Privacy First**

- **100% local storage** - Your data never leaves your device
- **No external tracking** or data collection
- **Complete privacy** - Only you can see your browsing habits

---

## 🖼️ Screenshots

### Main Dashboard

_Screenshot showing the main popup interface with pie chart and statistics_

[SCREENSHOT PLACEHOLDER - Main popup with pie chart and daily stats]

### Time Tracking View

_Detailed view of time spent on different websites_

[SCREENSHOT PLACEHOLDER - Stats list with time spent per site]

### Website Blocking Settings

_Configuration panel for setting up website blocks and time limits_

[SCREENSHOT PLACEHOLDER - Settings page with blocking options]

### Real-time Badge

_Extension badge showing current session time_

[SCREENSHOT PLACEHOLDER - Browser with extension badge visible]

---

## 🚀 Installation

### From Chrome Web Store

1. Visit the [Chrome Web Store page](#) _(coming soon)_
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension"

### Manual Installation (Developer Mode)

1. Download or clone this repository
   ```bash
   git clone https://github.com/yourusername/whatareyoudoing.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

---

## 🎯 Usage

### Getting Started

1. **Click the extension icon** in your toolbar to open the dashboard
2. **Browse normally** - time tracking starts automatically
3. **View statistics** by switching between "Today" and "Total" views
4. **Access settings** via the gear icon for blocking configuration

### Setting Up Website Blocking

1. Click the **settings button** in the extension popup
2. **Add websites** you want to block or limit
3. **Set time limits** (e.g., 30 minutes per day for social media)
4. **Configure schedules** (e.g., block during work hours)
5. **Save your settings** and enjoy distraction-free browsing

### Understanding Your Data

- **Pie Chart**: Visual representation of your top 10 most visited sites
- **Statistics List**: Detailed breakdown with time spent and session counts
- **Sorting**: Toggle between time-based and session-based sorting
- **Pagination**: Navigate through all your tracked websites

---

## ⚙️ Technical Details

### Built With

- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No external dependencies for core functionality
- **Chart.js** - Beautiful, responsive charts
- **Chrome Storage API** - Secure local data storage
- **Chrome Tabs API** - Seamless tab tracking

### File Structure

```
├── manifest.json          # Extension configuration
├── pages/
│   ├── popup/             # Main extension popup
│   └── settings/          # Settings configuration page
├── scripts/
│   └── background/        # Background service worker
└── assets/               # Icons and images
```

### Key Components

- **TabTracker**: Monitors active tabs and calculates time spent
- **StorageManager**: Handles all data persistence operations
- **BadgeManager**: Updates extension badge with real-time info
- **EventHandler**: Manages browser events and user interactions

---

## 🛣️ Roadmap

- [ ] **Export Data** - CSV/JSON export functionality
- [ ] **Advanced Analytics** - Weekly/monthly trends
- [ ] **Productivity Goals** - Set and track daily objectives
- [ ] **Focus Sessions** - Pomodoro timer integration
- [ ] **Dark Mode** - Theme customization options
- [ ] **Sync Across Devices** - Optional cloud synchronization

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

If you encounter any issues or have questions:

- **Open an issue** on GitHub
- **Check the FAQ** in the wiki
- **Star the repo** if you find it helpful!

---

<div align="center">
  <strong>Take control of your digital habits today! 🚀</strong>
  
  Made with ❤️ for productivity enthusiasts everywhere
</div>
