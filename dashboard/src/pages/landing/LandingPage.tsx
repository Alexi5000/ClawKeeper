// file: src/pages/landing/LandingPage.tsx
// description: Main landing page with 3D visualization and product features
// reference: src/App.tsx

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { 
  CircleDashed, 
  ArrowRight, 
  GitBranch, 
  History, 
  FileText, 
  Check, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Shaders
const vertexShader = `
  uniform float uTime;
  uniform float uDistortion;
  uniform float uSize;
  uniform vec2 uMouse;
  varying float vNoise;

  // Simplex Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 1.0/7.0;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
      vec3 pos = position;
      float noise = snoise(vec3(pos.x * 0.5 + uTime * 0.15, pos.y * 0.5, pos.z * 0.5));
      vNoise = noise;
      vec3 newPos = pos + (normal * noise * uDistortion);
      float dist = distance(uMouse * 10.0, newPos.xy);
      float interaction = smoothstep(6.0, 0.0, dist);
      newPos.z += interaction * 1.5;
      vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = uSize * (20.0 / -mvPosition.z);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  varying float vNoise;
  void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.45) discard;
      float alpha = 1.0;
      vec3 color1 = uColor;
      vec3 color2 = vec3(0.25, 0.35, 0.45);
      vec3 finalColor = mix(color1, color2, vNoise * 0.5 + 0.5);
      gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [pricingPeriod, setPricingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState('pro');

  // Three.js Effect
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xF5F5F7, 0.04);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear previous canvas if any
    while (canvasRef.current.firstChild) {
      canvasRef.current.removeChild(canvasRef.current.firstChild);
    }
    canvasRef.current.appendChild(renderer.domElement);

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    const geometry = new THREE.BoxGeometry(9, 9, 9, 40, 40, 40);
    const uniforms = {
      uTime: { value: 0 },
      uDistortion: { value: 0.0 },
      uSize: { value: 1.8 },
      uColor: { value: new THREE.Color('#0F172A') },
      uMouse: { value: new THREE.Vector2(0, 0) }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      blending: THREE.NormalBlending
    });

    const points = new THREE.Points(geometry, material);
    objectGroup.add(points);

    let time = 0;
    let mouseX = 0, mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      uniforms.uMouse.value.x += (mouseX - uniforms.uMouse.value.x) * 0.03;
      uniforms.uMouse.value.y += (mouseY - uniforms.uMouse.value.y) * 0.03;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      const w = window.innerWidth;
      if(w < 1024) {
        objectGroup.position.set(4, 5, -8);
        objectGroup.scale.set(0.65, 0.65, 0.65);
      } else {
        objectGroup.position.set(0, 2.5, 0);
        objectGroup.scale.set(0.65, 0.65, 0.65);
      }
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      objectGroup.rotation.z = scrollY * 0.0005;
      const w = window.innerWidth;
      const baseY = w < 1024 ? 5 : 2.5;
      objectGroup.position.y = baseY + scrollY * 0.005;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    handleResize();

    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.008;
      objectGroup.rotation.y = time * 0.2;
      uniforms.uTime.value = time;
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.02;
      camera.lookAt(0,0,0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Lifecycle Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      const section = document.getElementById('decision-lifecycle');
      const header = document.getElementById('lifecycle-header');
      const line = document.getElementById('lifecycle-line');
      const steps = document.querySelectorAll('.lifecycle-step');

      if (!section || !header || !line) return;

      const rect = section.getBoundingClientRect();
      const viewH = window.innerHeight;
      const travelDistance = rect.height - viewH;
      const scrolled = -rect.top;
      let progress = scrolled / travelDistance;
      progress = Math.max(0, Math.min(1, progress));

      header.style.opacity = progress > 0.02 ? '1' : '0';
      line.style.height = (progress * 100) + '%';

      steps.forEach((step) => {
        const t = parseFloat((step as HTMLElement).dataset.threshold || '0');
        const el = step as HTMLElement;
        if (progress >= t) {
          if (progress < t + 0.15) {
            el.classList.add('active');
            el.classList.replace('opacity-30', 'opacity-100');
            el.style.transform = 'scale(1.05)';
          } else {
            el.classList.add('active');
            el.classList.replace('opacity-30', 'opacity-50');
            el.style.transform = 'scale(1)';
          }
        } else {
          el.classList.remove('active');
          el.classList.replace('opacity-100', 'opacity-30');
          el.classList.replace('opacity-50', 'opacity-30');
          el.style.transform = 'scale(1)';
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const testimonials = [
    {
      quote: "ClawKeeper transforms how we manage our books. It’s no longer about manual entry, but strategic oversight.",
      author: "Marcus Alvarez",
      role: "CFO, Stripe"
    },
    {
      quote: "The ability to audit every AI decision brings a level of rigor to our financial reporting that didn't exist before.",
      author: "Sarah Chen",
      role: "VP Finance, Vercel"
    },
    {
      quote: "We moved from reactive accounting to proactive financial planning. ClawKeeper is the backbone of our finance stack.",
      author: "David Ross",
      role: "Controller, Linear"
    }
  ];

  const stats = [
    [
      { val: "5x", lbl: "Faster Close" },
      { val: "100%", lbl: "Audit Coverage" },
      { val: "Zero", lbl: "Errors" }
    ],
    [
      { val: "24/7", lbl: "Operations" },
      { val: "40%", lbl: "Cost Savings" },
      { val: "Full", lbl: "Compliance" }
    ],
    [
      { val: "2x", lbl: "Efficiency" },
      { val: "50+", lbl: "Agents" },
      { val: "100%", lbl: "Accuracy" }
    ]
  ];

  return (
    <div className="w-full relative bg-canvas text-foreground font-sans">
      {/* Fixed Backgrounds */}
      <div className="fixed inset-0 z-0 technical-grid pointer-events-none"></div>
      <div ref={canvasRef} className="fixed inset-0 z-0 opacity-100"></div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full px-6 py-5 md:px-12 flex justify-between items-center bg-canvas/90 backdrop-blur-md border-b border-border/50 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-obsidian text-white flex items-center justify-center rounded-sm">
            <CircleDashed className="w-3 h-3" />
          </div>
          <span className="font-sans text-sm font-bold tracking-tight text-obsidian">
            CLAWKEEPER
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="font-sans text-xs font-medium text-subtle hover:text-obsidian transition-colors">Product</a>
          <a href="#" className="font-sans text-xs font-medium text-subtle hover:text-obsidian transition-colors">Agents</a>
          <a href="#" className="font-sans text-xs font-medium text-subtle hover:text-obsidian transition-colors">Security</a>
          <a href="#" className="font-sans text-xs font-medium text-subtle hover:text-obsidian transition-colors">Company</a>
        </nav>

        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/login')} className="hidden md:block font-sans text-xs font-medium text-subtle hover:text-obsidian transition-colors">
            Sign in
          </button>
          <button className="group relative isolate overflow-hidden bg-obsidian text-white text-xs font-semibold px-6 py-2.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-white/10 transition-all duration-500 hover:scale-[1.04] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25)] hover:ring-white/20 active:scale-[0.98]">
            <div className="shimmer-layer absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent z-10"></div>
            <span className="relative z-20">Start Trial</span>
          </button>
        </div>
      </header>

      {/* Content Wrapper */}
      <div className="z-10 flex flex-col w-full relative">
        
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex flex-col lg:flex-row items-center justify-between px-6 md:px-12 lg:px-20 pt-32 pb-20 gap-16">
          <div className="max-w-2xl space-y-10 relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-border/60 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-sans text-[11px] font-medium text-subtle tracking-tight">
                  System v2.4 Available
                </span>
              </div>
              <h1 className="font-sans text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-obsidian leading-[0.95]">
                Autonomous
                <br />
                <span className="text-subtle">Bookkeeping.</span>
              </h1>
              <p className="max-w-md font-sans text-base text-subtle leading-relaxed">
                The financial brain for the modern enterprise. Automate AP, AR, and Reconciliation with 100% auditability and zero human error.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button className="group relative isolate overflow-hidden bg-obsidian text-white text-sm font-semibold px-8 py-3.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-white/10 transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.3)] hover:ring-white/20 active:scale-[0.98] flex items-center gap-2">
                <div className="shimmer-layer absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent z-0 pointer-events-none"></div>
                <span className="relative z-10">Request Demo</span>
                <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button className="px-8 py-3.5 bg-white text-obsidian border border-border text-sm font-medium rounded shadow-sm transition-all duration-300 hover:bg-gray-50 hover:border-obsidian/40 hover:text-black hover:shadow-md active:scale-[0.97]">
                Documentation
              </button>
            </div>
          </div>

          {/* Visual */}
          <div className="relative w-full max-w-lg aspect-square lg:aspect-[4/3] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-canvas via-white to-canvas opacity-50 blur-3xl"></div>
            <div className="premium-card w-full h-full p-6 relative overflow-hidden rounded-xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-obsidian to-transparent"></div>
              {/* Mock UI: Node Graph */}
              <div className="h-full w-full flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-border"></div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-subtle">
                      Financial Audit Trail
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-12 h-1.5 rounded-full bg-border/50"></span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  {/* SVG Graph */}
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    {/* Static Base Paths */}
                    <path d="M50,150 C100,150 100,80 150,80" fill="none" stroke="#E5E5E5" strokeWidth="2"></path>
                    <path d="M50,150 C100,150 100,220 150,220" fill="none" stroke="#E5E5E5" strokeWidth="2"></path>
                    <path d="M150,80 C200,80 200,120 250,120" fill="none" stroke="#E5E5E5" strokeWidth="2"></path>
                    <path d="M150,220 C200,220 200,180 250,180" fill="none" stroke="#E5E5E5" strokeWidth="2"></path>
                    <path d="M250,120 L320,150" fill="none" stroke="#E5E5E5" strokeWidth="2"></path>
                    <path d="M250,180 L320,150" fill="none" stroke="#E5E5E5" strokeWidth="2"></path>

                    {/* Active Signal Path */}
                    <path d="M50,150 C100,150 100,80 150,80 C200,80 200,120 250,120 L320,150" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" className="signal-path"></path>

                    {/* Nodes & Text */}
                    <circle cx="50" cy="150" r="6" fill="#111" className="node-context"></circle>
                    <text x="50" y="175" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10" fontWeight="600" fill="#111">
                      Invoice
                    </text>

                    <rect x="150" y="70" width="80" height="20" rx="4" fill="white" stroke="#111" strokeWidth="1.5" className="node-assumptions"></rect>
                    <text x="190" y="83" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="9" fontWeight="600" fill="#111" dy="1">
                      Extraction
                    </text>

                    <rect x="150" y="210" width="80" height="20" rx="4" fill="white" stroke="#E5E5E5"></rect>
                    <rect x="250" y="170" width="60" height="20" rx="4" fill="#F5F5F7"></rect>

                    <rect x="250" y="110" width="60" height="20" rx="4" fill="white" stroke="#111" strokeWidth="1.5" className="node-evidence"></rect>
                    <text x="280" y="123" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="9" fontWeight="600" fill="#111" dy="1">
                      Validation
                    </text>

                    <circle cx="320" cy="150" r="12" fill="#111" className="node-outcome"></circle>
                    <path d="M316 150l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="outcome-check"></path>
                    <text x="320" y="178" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="10" fontWeight="600" fill="#111">
                      Approved
                    </text>
                  </svg>

                  {/* Floating Label */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-obsidian text-white text-[10px] font-medium px-3 py-1.5 rounded shadow-xl">
                    Confidence: 99.9%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGOS */}
        <section className="border-y border-border/60 py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-10">
            <p className="text-xs font-semibold text-obsidian whitespace-nowrap md:w-auto w-full text-center md:text-left">
              TRUSTED BY FINANCE TEAMS AT
            </p>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-12 gap-y-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
              <span className="font-sans text-lg font-bold text-obsidian tracking-tight">VERCEL</span>
              <span className="font-sans text-lg font-bold text-obsidian tracking-tight">stripe</span>
              <span className="font-sans text-lg font-bold text-obsidian tracking-tight">Linear</span>
              <span className="font-sans text-lg font-bold text-obsidian tracking-tight">OpenAI</span>
              <span className="font-sans text-lg font-bold text-obsidian tracking-tight">Raycast</span>
            </div>
          </div>
        </section>

        {/* LIFECYCLE SECTION */}
        <section id="decision-lifecycle" className="relative w-full bg-canvas border-b border-border/60" style={{ height: '400vh' }}>
          <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
            <div className="max-w-4xl w-full px-6 md:px-12 relative z-10 flex flex-col items-center h-full py-20">
              <div className="text-center mb-12 shrink-0 opacity-0 transition-opacity duration-700" id="lifecycle-header">
                <h2 className="font-sans text-2xl md:text-3xl font-semibold text-obsidian tracking-tight mb-3">
                  Financial Lifecycle
                </h2>
                <p className="text-subtle text-sm max-w-md mx-auto">
                  From invoice receipt to reconciled ledger.
                </p>
              </div>
              <div className="relative w-full max-w-2xl flex-1 flex flex-col justify-center my-auto">
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-border/60 -translate-x-1/2"></div>
                <div id="lifecycle-line" className="absolute left-1/2 top-4 w-px bg-obsidian -translate-x-1/2 transition-all duration-75 ease-linear h-0 max-h-[calc(100%-2rem)]"></div>
                <div className="space-y-16 py-8 relative">
                  
                  {/* Step 1 */}
                  <div className="lifecycle-step group flex items-center justify-between w-full opacity-30 transition-all duration-500" data-threshold="0.1">
                    <div className="w-[42%] text-right pr-8">
                      <span className="font-mono text-[10px] text-subtle uppercase tracking-wider block mb-1">01 Ingest</span>
                      <h3 className="font-sans text-base font-semibold text-obsidian">Invoice Received</h3>
                      <p className="text-xs text-subtle mt-1 hidden md:block">Document arrives via email or upload.</p>
                    </div>
                    <div className="relative shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full border border-border bg-canvas group-[.active]:border-obsidian group-[.active]:bg-obsidian transition-colors duration-300"></div>
                    </div>
                    <div className="w-[42%] pl-8">
                      <div className="bg-white border border-border p-3 rounded shadow-sm inline-block">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-subtle" />
                          <span className="text-xs font-medium text-obsidian">INV-2024-001.pdf</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="lifecycle-step group flex items-center justify-between w-full opacity-30 transition-all duration-500" data-threshold="0.25">
                    <div className="w-[42%] text-right pr-8">
                      <div className="bg-white border border-border p-3 rounded shadow-sm inline-block text-left">
                        <span className="text-[10px] text-subtle block mb-1">Extracted</span>
                        <span className="text-xs font-medium text-obsidian">$5,000.00 - AWS Web Services</span>
                      </div>
                    </div>
                    <div className="relative shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full border border-border bg-canvas group-[.active]:border-obsidian group-[.active]:bg-obsidian transition-colors duration-300"></div>
                    </div>
                    <div className="w-[42%] pl-8">
                      <span className="font-mono text-[10px] text-subtle uppercase tracking-wider block mb-1">02 Extract</span>
                      <h3 className="font-sans text-base font-semibold text-obsidian">Data Extraction</h3>
                      <p className="text-xs text-subtle mt-1 hidden md:block">AI extracts key fields with 99% accuracy.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="lifecycle-step group flex items-center justify-between w-full opacity-30 transition-all duration-500" data-threshold="0.4">
                    <div className="w-[42%] text-right pr-8">
                      <span className="font-mono text-[10px] text-subtle uppercase tracking-wider block mb-1">03 Validate</span>
                      <h3 className="font-sans text-base font-semibold text-obsidian">Policy Check</h3>
                      <p className="text-xs text-subtle mt-1 hidden md:block">Verifying against budget and fraud rules.</p>
                    </div>
                    <div className="relative shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full border border-border bg-canvas group-[.active]:border-obsidian group-[.active]:bg-obsidian transition-colors duration-300"></div>
                    </div>
                    <div className="w-[42%] pl-8">
                      <div className="bg-white border border-border p-3 rounded shadow-sm inline-flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded flex items-center justify-center border border-border/50">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-[10px] text-subtle">Budget Check</div>
                          <div className="text-xs font-bold text-obsidian">Within Limit</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="lifecycle-step group flex items-center justify-between w-full opacity-30 transition-all duration-500" data-threshold="0.55">
                    <div className="w-[42%] text-right pr-8">
                      <div className="bg-white border border-border p-3 rounded shadow-sm inline-block max-w-[200px] text-left">
                        <div className="flex gap-1 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
                        </div>
                        <span className="text-xs font-medium text-obsidian">GL Code: 6000 - Software Subscription</span>
                      </div>
                    </div>
                    <div className="relative shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full border border-border bg-canvas group-[.active]:border-obsidian group-[.active]:bg-obsidian transition-colors duration-300"></div>
                    </div>
                    <div className="w-[42%] pl-8">
                      <span className="font-mono text-[10px] text-subtle uppercase tracking-wider block mb-1">04 Classify</span>
                      <h3 className="font-sans text-base font-semibold text-obsidian">GL Coding</h3>
                      <p className="text-xs text-subtle mt-1 hidden md:block">Automated categorization.</p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="lifecycle-step group flex items-center justify-between w-full opacity-30 transition-all duration-500" data-threshold="0.7">
                    <div className="w-[42%] text-right pr-8">
                      <span className="font-mono text-[10px] text-subtle uppercase tracking-wider block mb-1">05 Result</span>
                      <h3 className="font-sans text-base font-semibold text-obsidian">Payment</h3>
                      <p className="text-xs text-subtle mt-1 hidden md:block">Scheduled for payment run.</p>
                    </div>
                    <div className="relative shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full border border-border bg-canvas group-[.active]:border-obsidian group-[.active]:bg-obsidian transition-colors duration-300"></div>
                    </div>
                    <div className="w-[42%] pl-8">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-obsidian text-white text-xs font-semibold shadow-lg shadow-obsidian/20">
                        <span>Approved</span>
                        <Check className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="lifecycle-step group flex items-center justify-between w-full opacity-30 transition-all duration-500" data-threshold="0.85">
                    <div className="w-[42%] text-right pr-8">
                      <span className="font-mono text-[10px] text-subtle bg-slate-100 px-2 py-1 rounded inline-block">
                        ID: 8f2a...9c1
                      </span>
                    </div>
                    <div className="relative shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full border border-border bg-canvas group-[.active]:border-obsidian group-[.active]:bg-obsidian transition-colors duration-300"></div>
                    </div>
                    <div className="w-[42%] pl-8">
                      <span className="font-mono text-[10px] text-subtle uppercase tracking-wider block mb-1">06 Audit</span>
                      <h3 className="font-sans text-base font-semibold text-obsidian">Immutable Record</h3>
                      <p className="text-xs text-subtle mt-1 hidden md:block">Permanently traceable.</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-32 px-6 md:px-12 lg:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
              <div className="max-w-xl">
                <h2 className="font-sans text-4xl md:text-5xl font-semibold text-obsidian tracking-tight mb-6 leading-[1.1]">
                  Structured finance.
                  <span className="text-subtle block">Not just data points.</span>
                </h2>
                <p className="text-subtle text-lg leading-relaxed">
                  Bridge the gap between raw transactions and executive decisions with a platform designed for defensibility.
                </p>
              </div>
              <a href="#" className="pb-1 border-b border-obsidian text-sm font-medium hover:opacity-70 transition-opacity mb-2">
                Explore Platform Features
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Card 1: Audit Trail */}
              <div className="md:col-span-8 group relative bg-white border border-border rounded-xl overflow-hidden hover:border-obsidian/30 transition-all duration-500">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="max-w-md">
                      <div className="w-10 h-10 bg-canvas border border-border rounded flex items-center justify-center mb-6 text-obsidian shadow-sm">
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <h3 className="text-2xl font-semibold text-obsidian mb-3">Complete Audit Trail</h3>
                      <p className="text-subtle leading-relaxed">
                        Traverse the reasoning graph from payment to invoice. Every action is traceable.
                      </p>
                    </div>
                    <div className="hidden lg:block">
                      <div className="px-3 py-1 bg-canvas border border-border rounded text-[10px] font-mono text-subtle uppercase tracking-wider group-hover:text-obsidian group-hover:border-obsidian/30 transition-colors">
                        Live Trace
                      </div>
                    </div>
                  </div>
                  <div className="mt-12 h-32 w-full relative flex items-center border-t border-border/40 pt-6 overflow-hidden">
                    {/* SVG Animation Placeholder */}
                    <div className="w-full h-full bg-slate-50 rounded flex items-center justify-center text-xs text-subtle">
                      [Interactive Audit Visualization]
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Immutable History */}
              <div className="md:col-span-4 group relative bg-white border border-border rounded-xl overflow-hidden hover:border-obsidian/30 transition-all duration-500 flex flex-col">
                <div className="p-10 relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 bg-canvas border border-border rounded flex items-center justify-center mb-6 text-obsidian shadow-sm">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-obsidian mb-3">Immutable History</h3>
                  <p className="text-sm text-subtle leading-relaxed mb-8">
                    Time-travel through your ledger. Inspect past states with zero ambiguity.
                  </p>
                  <div className="mt-auto relative w-full h-32 flex flex-col justify-end items-center">
                    <div className="absolute w-[80%] h-12 bg-border/30 border border-border rounded-t-md top-4 scale-90 opacity-0 group-hover:opacity-100 group-hover:top-0 transition-all duration-500 ease-out"></div>
                    <div className="absolute w-[90%] h-12 bg-canvas border border-border rounded-t-md top-8 scale-95 opacity-50 group-hover:opacity-80 group-hover:top-6 transition-all duration-500 ease-out delay-75"></div>
                    <div className="relative w-full h-16 bg-white border border-border rounded shadow-sm flex items-center px-4 gap-4 z-10 transition-transform duration-300 group-hover:translate-y-[-5px] group-hover:shadow-md">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-obsidian uppercase tracking-wide">Current State</span>
                          <span className="text-[10px] font-mono text-subtle">v2.4.1</span>
                        </div>
                        <div className="h-1 w-full bg-canvas rounded overflow-hidden">
                          <div className="h-full w-2/3 bg-obsidian/20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Automated Reporting */}
              <div className="md:col-span-12 group relative bg-white border border-border rounded-xl overflow-hidden hover:border-obsidian/30 transition-all duration-500">
                <div className="p-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-1 max-w-lg">
                    <div className="w-10 h-10 bg-canvas border border-border rounded flex items-center justify-center mb-6 text-obsidian shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-obsidian mb-2">Automated Reporting</h3>
                    <p className="text-subtle leading-relaxed">
                      Turn complex ledger data into plain-language briefing documents automatically. Maintain a single source of truth.
                    </p>
                  </div>
                  <div className="flex-1 w-full flex items-center justify-center gap-6 h-32 relative">
                    {/* Animation Placeholder */}
                    <div className="w-full h-full bg-slate-50 rounded flex items-center justify-center text-xs text-subtle">
                      [Report Generation Animation]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-32 bg-obsidian text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="relative w-full h-[300px]">
                  {testimonials.map((t, i) => (
                    <div 
                      key={i}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col justify-center ${
                        i === activeTestimonial ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                      }`}
                    >
                      <h2 className="text-4xl font-semibold tracking-tighter mb-8">"{t.quote}"</h2>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">
                          {t.author[0]}
                        </div>
                        <div>
                          <div className="font-medium text-white">{t.author}</div>
                          <div className="text-sm text-white/50">{t.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-10">
                  <button 
                    onClick={() => setActiveTestimonial(prev => Math.max(0, prev - 1))}
                    disabled={activeTestimonial === 0}
                    className="group w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveTestimonial(prev => Math.min(testimonials.length - 1, prev + 1))}
                    disabled={activeTestimonial === testimonials.length - 1}
                    className="group w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col justify-between gap-6 md:gap-0 md:space-y-12 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-16">
                {stats[activeTestimonial].map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl font-bold mb-1">{stat.val}</div>
                    <div className="text-sm text-white/50">{stat.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-32 px-6 md:px-12 lg:px-20 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-sans text-3xl md:text-4xl font-semibold text-obsidian tracking-tight mb-4">
                Transparent Pricing
              </h2>
              <p className="text-subtle text-base">
                Start automating today. Scale as your business grows.
              </p>
              
              <div className="mt-8 flex items-center justify-center gap-3">
                <span className={`text-sm ${pricingPeriod === 'monthly' ? 'text-obsidian font-medium' : 'text-subtle'}`}>Monthly</span>
                <button 
                  onClick={() => setPricingPeriod(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                  className="w-12 h-6 rounded-full bg-border relative transition-colors duration-300 focus:outline-none"
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${pricingPeriod === 'yearly' ? 'left-7' : 'left-1'}`}></div>
                </button>
                <span className={`text-sm ${pricingPeriod === 'yearly' ? 'text-obsidian font-medium' : 'text-subtle'}`}>Yearly</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter */}
              <div 
                className={`group relative p-8 rounded-xl border flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedPlan === 'starter' 
                    ? 'bg-white border-obsidian shadow-xl scale-[1.02] z-10' 
                    : 'bg-white border-border hover:border-obsidian/30 hover:-translate-y-1'
                }`}
                onClick={() => setSelectedPlan('starter')}
              >
                <div className="mb-4 relative z-10">
                  <span className="font-semibold text-obsidian">Starter</span>
                </div>
                <div className="mb-4 flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-semibold text-obsidian">{pricingPeriod === 'monthly' ? '$49' : '$39'}</span>
                  <span className="text-sm text-subtle">/mo</span>
                </div>
                <p className="text-sm text-subtle mb-8 leading-relaxed relative z-10">
                  For small businesses and startups automating basic bookkeeping.
                </p>
                <ul className="space-y-4 mb-8 flex-1 relative z-10">
                  <li className="flex gap-3 text-sm text-subtle"><Check className="w-4 h-4 text-obsidian" /> 500 Invoices/mo</li>
                  <li className="flex gap-3 text-sm text-subtle"><Check className="w-4 h-4 text-obsidian" /> Basic Reports</li>
                  <li className="flex gap-3 text-sm text-subtle"><Check className="w-4 h-4 text-obsidian" /> Email Support</li>
                </ul>
                <Button variant="outline" className="w-full">Start Trial</Button>
              </div>

              {/* Growth */}
              <div 
                className={`group relative p-8 rounded-xl flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedPlan === 'pro' 
                    ? 'bg-obsidian text-white shadow-xl scale-[1.02] z-10' 
                    : 'bg-white border border-border hover:border-obsidian/30 hover:-translate-y-1'
                }`}
                onClick={() => setSelectedPlan('pro')}
              >
                <div className="mb-4">
                  <span className="font-semibold">Growth</span>
                </div>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{pricingPeriod === 'monthly' ? '$199' : '$159'}</span>
                  <span className="text-sm opacity-80">/mo</span>
                </div>
                <p className="text-sm opacity-60 mb-8 leading-relaxed">
                  For growing teams needing advanced reconciliation and approvals.
                </p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3 text-sm opacity-80"><Check className="w-4 h-4" /> 2,500 Invoices/mo</li>
                  <li className="flex gap-3 text-sm opacity-80"><Check className="w-4 h-4" /> Advanced Audit Trail</li>
                  <li className="flex gap-3 text-sm opacity-80"><Check className="w-4 h-4" /> Priority Support</li>
                </ul>
                <Button className="w-full bg-white text-obsidian hover:bg-gray-100">Get Started</Button>
              </div>

              {/* Enterprise */}
              <div 
                className={`group relative p-8 rounded-xl border flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedPlan === 'enterprise' 
                    ? 'bg-white border-obsidian shadow-xl scale-[1.02] z-10' 
                    : 'bg-white border-border hover:border-obsidian/30 hover:-translate-y-1'
                }`}
                onClick={() => setSelectedPlan('enterprise')}
              >
                <div className="mb-4 relative z-10">
                  <span className="font-semibold text-obsidian">Enterprise</span>
                </div>
                <div className="mb-4 flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-semibold text-obsidian">Custom</span>
                </div>
                <p className="text-sm text-subtle mb-8 leading-relaxed relative z-10">
                  For large organizations requiring custom integrations and SLA.
                </p>
                <ul className="space-y-4 mb-8 flex-1 relative z-10">
                  <li className="flex gap-3 text-sm text-subtle"><Check className="w-4 h-4 text-obsidian" /> Unlimited Volume</li>
                  <li className="flex gap-3 text-sm text-subtle"><Check className="w-4 h-4 text-obsidian" /> Custom ERP Integrations</li>
                  <li className="flex gap-3 text-sm text-subtle"><Check className="w-4 h-4 text-obsidian" /> Dedicated Account Manager</li>
                </ul>
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-white py-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
            <div className="max-w-xs space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-obsidian rounded-sm"></div>
                <span className="font-bold text-sm tracking-tight text-obsidian">CLAWKEEPER</span>
              </div>
              <p className="text-xs text-subtle leading-relaxed">
                Designed for the rigorous demands of modern enterprise finance.
                San Francisco, CA.
              </p>
              <div className="text-[10px] text-border">
                © 2026 ClawKeeper Systems Inc.
              </div>
            </div>

            <div className="flex gap-16">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-obsidian">Platform</h4>
                <ul className="space-y-2 text-xs text-subtle">
                  <li><a href="#" className="hover:text-obsidian">Features</a></li>
                  <li><a href="#" className="hover:text-obsidian">Security</a></li>
                  <li><a href="#" className="hover:text-obsidian">Enterprise</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-obsidian">Company</h4>
                <ul className="space-y-2 text-xs text-subtle">
                  <li><a href="#" className="hover:text-obsidian">About</a></li>
                  <li><a href="#" className="hover:text-obsidian">Careers</a></li>
                  <li><a href="#" className="hover:text-obsidian">Contact</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-obsidian">Connect</h4>
                <ul className="space-y-2 text-xs text-subtle">
                  <li><a href="#" className="hover:text-obsidian">Twitter</a></li>
                  <li><a href="#" className="hover:text-obsidian">LinkedIn</a></li>
                  <li><a href="#" className="hover:text-obsidian">GitHub</a></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
