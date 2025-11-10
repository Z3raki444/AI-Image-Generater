# 🪄 AI Image Generator (Stable Horde Client)

A simple, elegant web app that uses the **[Stable Horde API](https://stablehorde.net/)** to generate AI images from text prompts.  
Built with **HTML**, **CSS**, and **Vanilla JavaScript**, this tool allows users to create, preview, and download AI-generated images with customizable models, aspect ratios, and themes.

---

## 🚀 Features

- 🎨 **AI Image Generation** — Type any creative prompt and get stunning AI images.  
- 🧠 **Model Selection** — Choose from popular Stable Horde models (Deliberate, Realistic Vision, DreamShaper, RevAnimated).  
- 🖼️ **Aspect Ratio Options** — Square, Portrait, or Landscape image generation.  
- 🎲 **"Surprise Me" Button** — Instantly fills the prompt box with a random idea.  
- 🌗 **Light/Dark Mode** — Automatically detects your theme or toggle manually.  
- ⚡ **Queue-Friendly** — Optimized settings to avoid Kudos requirements for anonymous users.  
- 💾 **Download Option** — Save generated images locally in one click.

---

## 🧩 Project Structure

```
AI-Image-Generator/
│
├── index.html        # Main HTML structure
├── style.css         # Modern, responsive UI design
├── script.js         # Core logic and Stable Horde API handling
├── test.png          # (Optional) Sample image or preview asset
└── .gitattributes    # Git text normalization settings
```

---

## 🧠 How It Works

1. Enter a detailed prompt describing what you want.
2. Select a model, aspect ratio, and number of images.
3. (Optional) Enter your **Stable Horde API key** for faster generation.
4. Click **Generate**.
5. Wait for the magic — images appear in the gallery grid!

The app sends asynchronous POST requests to the Stable Horde `/generate/async` endpoint and periodically polls for job completion before rendering the generated images.

---

## 🛠️ Installation & Usage

### 🔧 Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-image-generator.git
   cd ai-image-generator
   ```

2. **Open `index.html`**
   - Double-click it, or  
   - Run a simple local server:
     ```bash
     python -m http.server 8080
     ```
   - Then visit [http://localhost:8080](http://localhost:8080)

3. Start generating images!

---

## 🧾 API Key (Optional)

Using a Stable Horde API key is **optional** but **highly recommended**.  
It improves queue priority and reduces wait times.

- Get one from: [https://stablehorde.net/register](https://stablehorde.net/register)
- Paste it in the "Stable Horde API Key" field before generating.

---

## 💡 Tips

- Avoid too-large image sizes or too-high step counts to prevent **KudosUpfront** errors.  
- Keep prompts descriptive but concise (avoid NSFW content).  
- Use Dark Mode for better contrast during night-time use.

---

## 📸 Preview

![App Preview](test.png)

---

## 📜 License

This project is open-source under the **MIT License**.  
Feel free to fork, improve, and share!

---

## 👨‍💻 Author

**Your Name**  
💌 [your.email@example.com]  
🌐 [your-portfolio-link.com]
