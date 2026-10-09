import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "simplex-noise";

const noise2D = createNoise2D();
const baseFrequency = 0.01,
    baseAmplitude = 12;

// persistence: 레이어마다 amplitude가 얼마나 변할지
// lacunarity: 레이어마다 frequency가 얼마나 변할지
function getOctaveNoise(x, z, octaves = 4, persistence = 0.5, lacunarity = 2) {
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

const positionAttribute = geometry.attributes.position;

for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i),
        z = positionAttribute.getZ(i);
    const y = getOctaveNoise(x, z);

    positionAttribute.setY(i, y);
}

// 빛이 굴곡에 대해서 제대로 반응하도록 vertex normal(이 뭔지 모르겠지만) 다시 계산
geometry.computeVertexNormals();

// 질감
const material = new THREE.MeshStandardMaterial({
    flatShading: true,
    color: 0x3f9b53,
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

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
