import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import type { CardModel } from "@/lib/dutch-mock";

interface Dutch3DTableProps {
  deckCount: number;
  discardTop?: CardModel | null;
  drawnCard?: CardModel | null;
  dutchAlert?: { playerId: string; playerName: string } | null;
  matchResult?: { success: boolean; message: string } | null;
  isMyTurn?: boolean;
  onDrawDeck?: () => void;
  className?: string;
}

// Utilitário para desenhar a textura de uma carta em alta resolução (512x768)
function createCardTexture(card: CardModel | null | undefined, isFaceDown: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;

  const w = canvas.width;
  const h = canvas.height;
  const r = 36; // Raio dos cantos

  // Traçado com cantos arredondados
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();

  if (isFaceDown) {
    // --- VERSO DA CARTA (Estilo Real DUTCH Casino) ---
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#131a3a");
    bgGrad.addColorStop(0.5, "#1f1042");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Padrão geométrico de losangos
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    const step = 32;
    for (let x = -h; x < w + h; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }

    // Moldura interna dourada
    ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Emblema Central
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "900 80px 'Montserrat', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("D", 0, -4);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "bold 16px sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("DUTCH", 0, 48);
    ctx.restore();
  } else {
    // --- FRENTE DA CARTA ---
    const val = card?.value || "?";
    const suit = card?.suit || "♠";
    const isRed = suit === "♥" || suit === "♦";
    const primaryColor = isRed ? "#ef4444" : "#1e293b";
    const accentColor = isRed ? "#dc2626" : "#0f172a";

    // Fundo da carta: marfim acetinado com leve vinheta
    const faceGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 450);
    faceGrad.addColorStop(0, "#ffffff");
    faceGrad.addColorStop(0.85, "#f8fafc");
    faceGrad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = faceGrad;
    ctx.fillRect(0, 0, w, h);

    // Borda sutil interna
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Canto Superior Esquerdo
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 64px 'Montserrat', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(val, 36, 32);

    ctx.font = "52px sans-serif";
    ctx.fillText(suit, 36, 104);

    // Canto Inferior Direito (Invertido)
    ctx.save();
    ctx.translate(w - 36, h - 32);
    ctx.rotate(Math.PI);
    ctx.fillText(val, 0, 0);
    ctx.fillText(suit, 0, 72);
    ctx.restore();

    // Símbolo Central Grande
    ctx.fillStyle = accentColor;
    ctx.font = "bold 180px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(suit, w / 2, h / 2 - 10);

    // Pontuação da carta no centro inferior
    ctx.fillStyle = "rgba(100, 116, 139, 0.7)";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const pts = card?.points ?? 0;
    ctx.fillText(`${pts} ${pts === 1 ? "PONTO" : "PONTOS"}`, w / 2, h / 2 + 150);
  }

  // Borda externa
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export function Dutch3DTable({
  deckCount,
  discardTop,
  drawnCard,
  dutchAlert,
  matchResult,
  isMyTurn,
  onDrawDeck,
  className,
}: Dutch3DTableProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Referências para objetos animados do Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const deckMeshRef = useRef<THREE.Mesh | null>(null);
  const discardMeshRef = useRef<THREE.Mesh | null>(null);
  const drawnCardGroupRef = useRef<THREE.Group | null>(null);
  const drawnCardMeshRef = useRef<THREE.Mesh | null>(null);
  const shockwaveRingRef = useRef<THREE.Mesh | null>(null);
  const sparkParticlesRef = useRef<THREE.Points | null>(null);
  const sparkVelocitiesRef = useRef<THREE.Vector3[]>([]);
  const pointerLightRef = useRef<THREE.PointLight | null>(null);

  // Estados de animação
  const shakeIntensityRef = useRef(0);
  const shockwaveScaleRef = useRef(0);
  const shockwaveOpacityRef = useRef(0);
  const targetDrawnY = useRef(0);
  const targetDrawnRotY = useRef(Math.PI);
  const isHoveringDeckRef = useRef(false);

  // Teste de WebGL na inicialização
  useEffect(() => {
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Inicialização da Cena Three.js
  useEffect(() => {
    if (!webglSupported || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Cena
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // Canvas transparente para mesclar com o tema

    // 2. Câmera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 10, 10.5);
    camera.lookAt(0, -0.4, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Iluminação
    // Luz ambiente suave
    const ambientLight = new THREE.AmbientLight(0xd4e2d4, 0.9);
    scene.add(ambientLight);

    // Spotlight principal do teto do cassino
    const spotLight = new THREE.SpotLight(0xfffaed, 3.8);
    spotLight.position.set(0, 12, 3);
    spotLight.angle = 0.65;
    spotLight.penumbra = 0.6;
    spotLight.decay = 1.6;
    spotLight.distance = 25;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 5;
    spotLight.shadow.camera.far = 20;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);

    // Luz pontual móvel do mouse (brilho especular sutil)
    const pointerLight = new THREE.PointLight(0x38bdf8, 1.4, 14, 1.8);
    pointerLight.position.set(0, 4, 2);
    scene.add(pointerLight);
    pointerLightRef.current = pointerLight;

    // 5. Geometria da Mesa de Feltro 3D
    // Superfície de feltro (oval chanfrado)
    const feltGeometry = new THREE.CylinderGeometry(8.5, 8.5, 0.3, 64);
    feltGeometry.scale(1.4, 1, 0.85); // Formato oval de cassino

    // Feltro verde-esmeralda realista com micro-rugosidade
    const feltMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a3b27,
      roughness: 0.82,
      metalness: 0.04,
    });
    const feltMesh = new THREE.Mesh(feltGeometry, feltMaterial);
    feltMesh.position.set(0, -0.15, 0);
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Borda de madeira nobre polida (Mahogany rim)
    const rimGeometry = new THREE.TorusGeometry(8.5, 0.5, 24, 64);
    rimGeometry.scale(1.42, 0.86, 0.6);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x331409,
      roughness: 0.25,
      metalness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, -0.1, 0);
    rimMesh.castShadow = true;
    rimMesh.receiveShadow = true;
    scene.add(rimMesh);

    // Linha dourada da Arena no Feltro
    const ringGeo = new THREE.RingGeometry(5.2, 5.26, 64);
    ringGeo.scale(1.3, 0.8, 1);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const tableRing = new THREE.Mesh(ringGeo, ringMat);
    tableRing.rotation.x = -Math.PI / 2;
    tableRing.position.set(0, 0.01, 0);
    scene.add(tableRing);

    // Anel de Onda de Choque do Dutch (escondido inicialmente)
    const shockwaveGeo = new THREE.RingGeometry(0.1, 0.35, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.set(0, 0.02, 0);
    scene.add(shockwave);
    shockwaveRingRef.current = shockwave;

    // 6. Monte de Cartas (Deck) em 3D
    const cardGeo = new THREE.BoxGeometry(2.1, 0.04, 3.1);
    const deckBackTex = createCardTexture(null, true);

    // Materiais das faces do bloco do deck
    const deckSideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
    const deckTopMat = new THREE.MeshStandardMaterial({
      map: deckBackTex,
      roughness: 0.45,
      metalness: 0.08,
    });
    const deckMaterials = [
      deckSideMat,
      deckSideMat,
      deckTopMat, // Topo (verso da carta)
      deckSideMat,
      deckSideMat,
      deckSideMat,
    ];

    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 3.1), deckMaterials);
    deckMesh.position.set(-2.6, 0.3, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    deckMesh.name = "deck";
    scene.add(deckMesh);
    deckMeshRef.current = deckMesh;

    // 7. Monte de Descarte em 3D
    // Sub-cartas espalhadas embaixo para aspecto realista de mesa
    for (let i = 0; i < 3; i++) {
      const subCardMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
      const subCard = new THREE.Mesh(cardGeo, subCardMat);
      subCard.position.set(2.6 + (Math.random() - 0.5) * 0.15, 0.02 * (i + 1), (Math.random() - 0.5) * 0.15);
      subCard.rotation.y = (Math.random() - 0.5) * 0.18;
      subCard.receiveShadow = true;
      scene.add(subCard);
    }

    // Carta de topo do Descarte
    const discardTopTex = createCardTexture(discardTop, false);
    const discardTopMat = new THREE.MeshStandardMaterial({
      map: discardTopTex,
      roughness: 0.4,
      metalness: 0.05,
    });
    const discardMesh = new THREE.Mesh(cardGeo, [
      deckSideMat,
      deckSideMat,
      discardTopMat,
      deckSideMat,
      deckSideMat,
      deckSideMat,
    ]);
    discardMesh.position.set(2.6, 0.08, 0);
    discardMesh.rotation.y = -0.05;
    discardMesh.castShadow = true;
    discardMesh.receiveShadow = true;
    discardMesh.name = "discard";
    scene.add(discardMesh);
    discardMeshRef.current = discardMesh;

    // 8. Carta Comprada Flutuante em 3D
    const drawnGroup = new THREE.Group();
    drawnGroup.position.set(-2.6, 0.35, 0);
    drawnGroup.visible = false;

    // Dupla face para a carta comprada (verso e frente)
    const cardFrontMat = new THREE.MeshStandardMaterial({
      map: createCardTexture(drawnCard, false),
      roughness: 0.35,
      metalness: 0.08,
    });
    const cardBackMat = new THREE.MeshStandardMaterial({
      map: deckBackTex,
      roughness: 0.45,
      metalness: 0.08,
    });

    const drawnMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.02, 3.1), [
      deckSideMat,
      deckSideMat,
      cardFrontMat, // Top (frente)
      cardBackMat,  // Bottom (verso)
      deckSideMat,
      deckSideMat,
    ]);
    drawnMesh.castShadow = true;
    drawnGroup.add(drawnMesh);
    scene.add(drawnGroup);
    drawnCardGroupRef.current = drawnGroup;
    drawnCardMeshRef.current = drawnMesh;

    // 9. Partículas de Poeira / Brilho de Cassino no cone de luz
    const dustCount = 45;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 12;
      dustPositions[i * 3 + 1] = Math.random() * 5 + 0.5;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.06,
      transparent: true,
      opacity: 0.6,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // 10. Partículas de Faíscas para Snap (Match Result)
    const sparkCount = 35;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = -10; // escondido
      sparkPositions[i * 3 + 2] = 0;
      sparkVelocities.push(new THREE.Vector3());
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0,
    });
    const sparkMesh = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkMesh);
    sparkParticlesRef.current = sparkMesh;
    sparkVelocitiesRef.current = sparkVelocities;

    // 11. Eventos de Ponteiro (Parallax e Raycast)
    const raycaster = new THREE.Raycaster();
    const mouseNorm = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseNorm.set(x, y);

      // Movimenta a luz pontual sobre a mesa
      if (pointerLightRef.current) {
        pointerLightRef.current.position.x = x * 4;
        pointerLightRef.current.position.z = -y * 3 + 1.5;
      }

      // Parallax suave da câmera
      if (cameraRef.current) {
        cameraRef.current.position.x = x * 0.6;
        cameraRef.current.position.y = 10 + y * 0.4;
      }

      // Detecção de Hover no Deck
      raycaster.setFromCamera(mouseNorm, camera);
      const intersects = raycaster.intersectObjects([deckMesh]);
      if (intersects.length > 0) {
        isHoveringDeckRef.current = true;
        container.style.cursor = "pointer";
      } else {
        isHoveringDeckRef.current = false;
        container.style.cursor = "default";
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseNorm.set(x, y);

      raycaster.setFromCamera(mouseNorm, camera);
      const intersects = raycaster.intersectObjects([deckMesh]);
      if (intersects.length > 0 && onDrawDeck) {
        onDrawDeck();
      }
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("click", handleClick);

    // 12. Responsividade via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 13. Loop de Animação (60 FPS)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Flutuação das partículas de poeira
      const dustPos = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        let py = dustPos.getY(i) - delta * 0.15;
        if (py < 0.2) py = 5;
        dustPos.setY(i, py);
      }
      dustPos.needsUpdate = true;

      // Hover no Deck: elevação suave
      if (deckMeshRef.current) {
        const targetDeckY = isHoveringDeckRef.current ? 0.45 : 0.3;
        deckMeshRef.current.position.y += (targetDeckY - deckMeshRef.current.position.y) * 0.15;
      }

      // Animação da Carta Comprada (elevação e giro 3D)
      if (drawnCardGroupRef.current && drawnCardMeshRef.current) {
        if (drawnCardGroupRef.current.visible) {
          // Move suavemente do deck para o centro flutuante
          drawnCardGroupRef.current.position.x += (0 - drawnCardGroupRef.current.position.x) * 0.12;
          drawnCardGroupRef.current.position.y += (targetDrawnY.current + Math.sin(time * 3) * 0.08 - drawnCardGroupRef.current.position.y) * 0.12;
          drawnCardGroupRef.current.position.z += (1.2 - drawnCardGroupRef.current.position.z) * 0.12;

          // Rotação para revelar a face (flip suave)
          drawnCardMeshRef.current.rotation.y += (targetDrawnRotY.current - drawnCardMeshRef.current.rotation.y) * 0.14;
        }
      }

      // Efeito de Onda de Choque do Dutch
      if (shockwaveRingRef.current && shockwaveScaleRef.current > 0) {
        shockwaveScaleRef.current += delta * 6;
        shockwaveOpacityRef.current -= delta * 0.9;
        if (shockwaveOpacityRef.current <= 0) {
          shockwaveScaleRef.current = 0;
          shockwaveOpacityRef.current = 0;
        }
        shockwaveRingRef.current.scale.set(shockwaveScaleRef.current, shockwaveScaleRef.current, 1);
        (shockwaveRingRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, shockwaveOpacityRef.current);
      }

      // Efeito de Tremer a Câmera (Screen/Camera Shake)
      if (cameraRef.current && shakeIntensityRef.current > 0) {
        cameraRef.current.position.x += (Math.random() - 0.5) * shakeIntensityRef.current;
        cameraRef.current.position.z += (Math.random() - 0.5) * shakeIntensityRef.current;
        shakeIntensityRef.current = Math.max(0, shakeIntensityRef.current - delta * 1.5);
      }

      // Atualização das Faíscas de Snap
      if (sparkParticlesRef.current && sparkVelocitiesRef.current.length > 0) {
        const positions = (sparkParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute);
        let activeSparks = false;
        for (let i = 0; i < sparkCount; i++) {
          const v = sparkVelocitiesRef.current[i];
          if (v.lengthSq() > 0.001) {
            activeSparks = true;
            positions.setX(i, positions.getX(i) + v.x * delta);
            positions.setY(i, positions.getY(i) + v.y * delta);
            positions.setZ(i, positions.getZ(i) + v.z * delta);
            v.y -= delta * 9.8; // Gravidade
            v.multiplyScalar(0.96); // Atrito do ar
          }
        }
        if (activeSparks) {
          positions.needsUpdate = true;
          const mat = sparkParticlesRef.current.material as THREE.PointsMaterial;
          mat.opacity = Math.max(0, mat.opacity - delta * 0.8);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 14. Limpeza ao Desmontar
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("click", handleClick);
      resizeObserver.disconnect();

      // Dispose de geometrias e materiais Three.js
      feltGeometry.dispose();
      feltMaterial.dispose();
      rimGeometry.dispose();
      rimMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      cardGeo.dispose();
      deckMesh.geometry.dispose();
      deckMaterials.forEach((m) => m.dispose());
      deckBackTex.dispose();
      discardTopTex.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();

      renderer.dispose();
      container.innerHTML = "";
    };
  }, [webglSupported, onDrawDeck]);

  // Atualiza altura do monte quando a contagem do baralho muda
  useEffect(() => {
    if (deckMeshRef.current) {
      const height = Math.max(0.1, (deckCount / 52) * 0.6);
      deckMeshRef.current.scale.set(1, height / 0.6, 1);
      deckMeshRef.current.position.y = height / 2;
    }
  }, [deckCount]);

  // Atualiza a carta do topo do descarte em 3D
  useEffect(() => {
    if (discardMeshRef.current && discardTop) {
      const newTex = createCardTexture(discardTop, false);
      const materials = discardMeshRef.current.material as THREE.MeshStandardMaterial[];
      if (materials && materials[2]) {
        materials[2].map?.dispose();
        materials[2].map = newTex;
        materials[2].needsUpdate = true;
      }
    }
  }, [discardTop]);

  // Reage à Carta Comprada (animação de puxar e virar no espaço 3D)
  useEffect(() => {
    if (!drawnCardGroupRef.current || !drawnCardMeshRef.current) return;

    if (drawnCard) {
      // Atualiza textura da frente da carta comprada
      const materials = drawnCardMeshRef.current.material as THREE.MeshStandardMaterial[];
      if (materials && materials[2]) {
        materials[2].map?.dispose();
        materials[2].map = createCardTexture(drawnCard, false);
        materials[2].needsUpdate = true;
      }

      // Reinicia posição a partir do deck e inicia animação
      drawnCardGroupRef.current.position.set(-2.6, 0.4, 0);
      drawnCardMeshRef.current.rotation.set(0, Math.PI, 0); // Começa virada para baixo
      drawnCardGroupRef.current.visible = true;

      targetDrawnY.current = 1.6;
      targetDrawnRotY.current = 0; // Gira para revelar a face
    } else {
      drawnCardGroupRef.current.visible = false;
    }
  }, [drawnCard]);

  // Efeito ao Bater DUTCH (Impacto na mesa, tremor e onda de choque)
  useEffect(() => {
    if (dutchAlert) {
      shakeIntensityRef.current = 0.35;
      shockwaveScaleRef.current = 0.5;
      shockwaveOpacityRef.current = 1.0;
    }
  }, [dutchAlert]);

  // Efeito de Snap (explosão de faíscas azuis/douradas)
  useEffect(() => {
    if (matchResult && sparkParticlesRef.current && sparkVelocitiesRef.current) {
      const isSuccess = matchResult.success;
      const mat = sparkParticlesRef.current.material as THREE.PointsMaterial;
      mat.color.setHex(isSuccess ? 0x38bdf8 : 0xef4444);
      mat.opacity = 1.0;

      const positions = sparkParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const count = positions.count;

      for (let i = 0; i < count; i++) {
        // Origem no monte de descarte
        positions.setXYZ(i, 2.6, 0.2, 0);

        // Velocidade radial para cima e para fora
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        sparkVelocitiesRef.current[i].set(
          Math.cos(angle) * speed * 0.7,
          Math.random() * 5 + 3,
          Math.sin(angle) * speed * 0.7
        );
      }
      positions.needsUpdate = true;
    }
  }, [matchResult]);

  if (!webglSupported) {
    return null;
  }

  return (
    <div
      ref={mountRef}
      className={className || "absolute inset-0 w-full h-full pointer-events-auto select-none"}
      style={{ touchAction: "none" }}
    />
  );
}
