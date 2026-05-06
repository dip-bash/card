async function init() {
  const app = document.getElementById('app');
  const avatarContainer = document.getElementById('avatar-container');
  const userName = document.getElementById('user-name');
  const userDetails = document.getElementById('user-details');
  const socialLinks = document.getElementById('social-links');
  const bioContent = document.getElementById('bio-content');

  try {
    // Try both paths to support simple python servers and standard dev servers like Vite
    let response = await fetch('/config.md');
    if (!response.ok) {
      response = await fetch('/public/config.md');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} while fetching config.md`);
    }
    const text = await response.text();

    // Simple parser for YAML frontmatter
    const match = text.match(/^---([\s\S]+?)---([\s\S]*)$/);
    if (!match) throw new Error("Invalid Markdown format");

    const yamlStr = match[1];
    const content = match[2];

    const data = parseYAML(yamlStr);

    // Set Name & Details
    userName.textContent = data.name || 'USER NAME';
    userDetails.textContent = data.details || '';

    // Add staggering classes for animation
    document.querySelector('.relative.mb-12').classList.add('fade-in', 'stagger-1');
    userName.classList.add('fade-in', 'stagger-2');
    userDetails.classList.add('fade-in', 'stagger-3');
    socialLinks.classList.add('fade-in', 'stagger-3');
    
    // Add profile card class for hover
    document.querySelector('.w-48.h-48').parentElement.classList.add('profile-card');

    // Render Bio
    if (content.trim()) {
      bioContent.innerHTML = marked.parse(content);
      document.getElementById('markdown-content').classList.add('fade-in', 'stagger-3');
    } else {
      document.getElementById('markdown-content').style.display = 'none';
    }

    // Resolve Avatar
    await resolveAvatar(data.github_username, data.name);

    // Render Socials
    if (data.socials && Array.isArray(data.socials)) {
      data.socials.forEach(social => {
        const a = document.createElement('a');
        a.href = social.link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "social-link w-14 h-14 rounded-2xl border-[1px] border-gray-300 flex items-center justify-center text-gray-600 active:scale-95";
        
        // Use Lucide icon
        let iconName = social.icon.toLowerCase();
        
        // Comprehensive mapping for common Lucide icons that don't follow simple lowercase
        const iconMapping = {
          'github': 'github',
          'linkedin': 'linkedin',
          'twitter': 'twitter',
          'mail': 'mail',
          'globe': 'globe',
          'filetext': 'file-text',
          'external-link': 'external-link',
          'instagram': 'instagram',
          'youtube': 'youtube',
          'facebook': 'facebook'
        };

        if (iconMapping[iconName]) {
          iconName = iconMapping[iconName];
        }

        a.innerHTML = `<i data-lucide="${iconName}" style="width: 24px; height: 24px; stroke-width: 1.5"></i>`;
        socialLinks.appendChild(a);

        // Magnetic Effect
        a.addEventListener('mousemove', (e) => {
          const rect = a.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          a.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        a.addEventListener('mouseleave', () => {
          a.style.transform = `translate(0px, 0px)`;
        });
      });
      // Initialize icons
      lucide.createIcons();
    }

    // Initialize Scroll Reveal
    initScrollReveal();

    // Show App
    app.classList.add('fade-in');
    app.style.opacity = '1';

    // Initialize Interactive Elements
    initInteractions();
    initShareModal();

  } catch (error) {
    console.error("Failed to load config:", error);
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h2 class="text-2xl font-serif mb-4">Wait, something's missing</h2>
        <p class="text-gray-500 mb-8">We couldn't load your configuration file.</p>
        <div class="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-mono max-w-md overflow-auto border border-red-100">
          ${error.message}
        </div>
        <p class="mt-8 text-xs text-gray-400">Make sure config.md exists in your public folder.</p>
      </div>
    `;
    app.classList.add('fade-in');
    app.style.opacity = '1';
  }
}

function initInteractions() {
  const cursor = document.getElementById('cursor');
  const glow = document.getElementById('mouse-glow');
  
  if (!cursor || !glow) return;

  document.addEventListener('mousemove', (e) => {
    // Smoother movement using CSS variables
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    
    // Glow follows with a slight lag for "softness"
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });

  // Hover states for cursor
  const interactiveElements = document.querySelectorAll('a, button, .profile-card, img');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

function initScrollReveal() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Mark existing sections for reveal if they are large enough
  const bio = document.getElementById('markdown-content');
  if (bio) {
    bio.classList.add('reveal');
    observer.observe(bio);
  }
  
  // Future paragraphs in bio
  setTimeout(() => {
    const pTags = document.querySelectorAll('.markdown-body p, .markdown-body h1, .markdown-body h2');
    pTags.forEach(p => {
      p.classList.add('reveal');
      observer.observe(p);
    });
  }, 1000);
}

function initShareModal() {
  const shareBtn = document.getElementById('share-btn');
  const modal = document.getElementById('qr-modal');
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('close-modal');
  const qrImage = document.getElementById('qr-image');
  const urlText = document.getElementById('current-url');

  if (!shareBtn || !modal) return;

  const toggleModal = (show) => {
    if (show) {
      const currentUrl = window.location.href;
      urlText.textContent = currentUrl;
      qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
      
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.querySelector('.relative').classList.remove('scale-90');
      modal.querySelector('.relative').classList.add('scale-100');
    } else {
      modal.classList.add('opacity-0', 'pointer-events-none');
      modal.querySelector('.relative').classList.remove('scale-100');
      modal.querySelector('.relative').classList.add('scale-90');
    }
  };

  shareBtn.addEventListener('click', () => toggleModal(true));
  overlay.addEventListener('click', () => toggleModal(false));
  closeBtn.addEventListener('click', () => toggleModal(false));
}

function parseYAML(yaml) {
  const obj = {};
  const lines = yaml.split('\n');
  let currentKey = null;

  lines.forEach(line => {
    const trimLine = line.trim();
    if (!trimLine || trimLine.startsWith('#')) return;

    // Handle key-value
    if (trimLine.includes(':')) {
      const parts = trimLine.split(':');
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim();

      // Basic cleanup for quotes or multiline marker
      if (value === '|') {
        currentKey = key;
        obj[key] = "";
        return;
      }

      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      
      // Handle simple indentation for arrays (limited to socials for this use case)
      if (key === 'socials') {
        obj.socials = [];
        currentKey = 'socials_list';
      } else if (currentKey === 'socials_list' && trimLine.startsWith('-')) {
        // Nested properties in list
        return;
      } else {
        obj[key] = value.replace(/\\n/g, '\n');
        currentKey = null;
      }
    } else if (currentKey === 'socials_list' && trimLine.startsWith('-')) {
      // This is a simplified YAML parser for our specific socials format
    }
  });

  // Find socials
  const cleanYaml = yaml.replace(/\r/g, '');
  const nameMatch = cleanYaml.match(/name:\s*(?:["']|\|)?([\s\S]+?)(?=\n\w+:|$)/);
  const detailsMatch = cleanYaml.match(/details:\s*["']?([\s\S]+?)(?=["']?\n|$)/);
  const githubMatch = cleanYaml.match(/github_username:\s*["']?([\s\S]+?)(?=["']?\n|$)/);
  
  const simplifiedData = {
    name: nameMatch ? nameMatch[1].replace(/^\|/, '').trim().replace(/\\n/g, '\n') : "USER NAME",
    details: detailsMatch ? detailsMatch[1].trim() : "",
    github_username: githubMatch ? githubMatch[1].trim() : ""
  };

  // Find socials
  const socialsBlock = cleanYaml.match(/socials:([\s\S]+)$/);
  if (socialsBlock) {
    // Split by newline followed by optional spaces and a hyphen
    const rawSocials = socialsBlock[1].split(/\n\s*-\s+/).filter(s => s.trim());
    simplifiedData.socials = rawSocials.map(block => {
      const icon = block.match(/icon:\s*["']?([\w-]+)["']?/);
      const link = block.match(/link:\s*["']?([^"'\n]+)["']?/);
      return {
        icon: icon ? icon[1] : 'Globe',
        link: link ? link[1] : '#'
      };
    });
  }

  return simplifiedData;
}

async function resolveAvatar(githubUsername, name) {
  const container = document.getElementById('avatar-container');
  
  // 1. Local check
  const extensions = ['jpg', 'png', 'jpeg'];
  for (const ext of extensions) {
    try {
      const res = await fetch(`/profile.${ext}`, { method: 'HEAD' });
      if (res.ok && res.headers.get('content-type')?.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `/profile.${ext}`;
        img.alt = name;
        img.className = "w-full h-full object-cover";
        container.appendChild(img);
        return;
      }
    } catch (e) {}
  }

  // 2. GitHub Check
  if (githubUsername) {
    try {
      const res = await fetch(`https://api.github.com/users/${githubUsername}`);
      const data = await res.json();
      if (data.avatar_url) {
        const img = document.createElement('img');
        img.src = data.avatar_url;
        img.alt = name;
        img.className = "w-full h-full object-cover";
        container.appendChild(img);
        return;
      }
    } catch (e) {}
  }

  // 3. Fallback circle
  container.innerHTML = `
    <div class="w-full h-full flex items-center justify-center text-gray-400">
      <div class="w-24 h-24 border-[0.5px] border-current opacity-20 rotate-45 absolute"></div>
      <div class="w-24 h-24 border-[0.5px] border-current opacity-20 -rotate-45 absolute"></div>
    </div>
  `;
}

init();
