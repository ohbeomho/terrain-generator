import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "simplex-noise";

const noise2D = createNoise2D();
let baseFrequency = 0.01,
  baseAmplitude = 12,
  octaves = 4,
  persistence = 0.5,
  lacunarity = 2;

// persistence: 레이어마다 amplitude가 얼마나 변할지
// lacunarity: 레이어마다 frequency가 얼마나 변할지
function getOctaveNoise(x, z, octaves, persistence, lacunarity) {
  let totalHeight = 0,
    frequency = baseFrequency,
    amplitude = baseAmplitude;

  for (let i = 0; i < octaves; i++) {
    totalHeight += noise2D(x * frequency, z * frequency) * amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return totalHeight;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  80,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new OrbitControls(camera, renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, 10);
controls.update();

// 그림자를 살짝 연하게
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
sunLight.position.set(100, 100, 50);
scene.add(sunLight);

// 100x100 크기, 64x64개의 부분
const geometry = new THREE.PlaneGeometry(100, 100, 64, 64);
geometry.rotateX(Math.PI / 2); // Y가 위를 향하게 회전
// 색상 속성 추가
geometry.attributes.color = new THREE.BufferAttribute(
  new Float32Array(geometry.attributes.position.count * 3),
  3,
);

const positionAttribute = geometry.attributes.position,
  colorAttribute = geometry.attributes.color;
const heights = new Array(positionAttribute.count).fill(0),
  randoms = Array.from(
    { length: positionAttribute.count },
    () => Math.random() + 0.5,
  );

function generateTerrain() {
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i),
      z = positionAttribute.getZ(i);
    const y = getOctaveNoise(x, z, octaves, persistence, lacunarity);

    positionAttribute.setY(i, y);
    heights[i] = y;

    // 2보다 낮으면 물 (파란색)
    if (y < 2) {
      colorAttribute.setXYZ(i, 0.2, 0.2, 0.8);
      // 물 높이는 거의 일정하게
      const y_ = 2 + Math.random() / 10 - 0.05;
      positionAttribute.setY(i, y_);
      heights[i] = y_;
    } else colorAttribute.setXYZ(i, 0.2, 0.8, 0.2); // 땅 (초록색)
  }

  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
  // 빛이 굴곡에 대해서 제대로 반응하도록 vertex normal(이 뭔지 모르겠지만) 다시 계산
  geometry.computeVertexNormals();
}

generateTerrain();

// 질감
const material = new THREE.MeshStandardMaterial({
  flatShading: true,
  color: 0xffffff,
  vertexColors: true,
  wireframe: false,
  side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function updateWater(deltaTime) {
  for (let i = 0; i < positionAttribute.count; i++) {
    if (heights[i] >= 2) continue;

    positionAttribute.setY(
      i,
      heights[i] + Math.sin(deltaTime / 400 + (i * randoms[i]) / 10) / 3,
    );
  }

  positionAttribute.needsUpdate = true;
}

function animate(deltaTime) {
  updateWater(deltaTime);

  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

const generateButton = document.getElementById("generate");
const octavesInput = document.getElementById("octaves-input"),
  baseFrequencyInput = document.getElementById("base-frequency-input"),
  baseAmplitudeInput = document.getElementById("base-amplitude-input"),
  lacunarityInput = document.getElementById("lacunarity-input"),
  persistenceInput = document.getElementById("persistence-input");

octavesInput.value = octaves;
baseFrequencyInput.value = baseFrequency;
baseAmplitudeInput.value = baseAmplitude;
lacunarityInput.value = lacunarity;
persistenceInput.value = persistence;

octavesInput.addEventListener(
  "input",
  () => (octaves = octavesInput.valueAsNumber),
);
baseFrequencyInput.addEventListener(
  "input",
  () => (baseFrequency = baseFrequencyInput.valueAsNumber),
);
baseAmplitudeInput.addEventListener(
  "input",
  () => (baseAmplitude = baseAmplitudeInput.valueAsNumber),
);
lacunarityInput.addEventListener(
  "input",
  () => (lacunarity = lacunarityInput.valueAsNumber),
);
persistenceInput.addEventListener(
  "input",
  () => (persistence = persistenceInput.valueAsNumber),
);
generateButton.addEventListener("click", generateTerrain);
