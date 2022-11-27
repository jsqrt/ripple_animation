/* eslint-disable no-unreachable */
import * as T from 'three';
import dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import fragment from './shader/fragment.glsl';
// import vertex from '../../shader/vertex.glsl';

import brush from '../../images/burash01.png';
import image from '../../images/image.jpeg';

export default class Sketch {
	constructor(options) {
		this.scene = new T.Scene();
		this.sceneSecond = new T.Scene();

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new T.WebGLRenderer();
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0x000000, 1);
		this.renderer.outputEncoding = T.sRGBEncoding;

		this.container.appendChild(this.renderer.domElement);

		this.camera = new T.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.001,
			1000,
		);

		this.baseTexture = new T.WebGLRenderTarget(this.width, this.height, {
			minFilter: T.LinearFilter,
			magFilter: T.LinearFilter,
			format: T.RGBAFormat,
		});

		const frustumSize = this.height;
		const aspect = this.width / this.height;
		this.camera = new T.OrthographicCamera((frustumSize * aspect) / -2, (frustumSize * aspect) / 2, frustumSize / 2, frustumSize / -2, -1000, 1000);
		this.camera.position.set(0, 0, 2);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;
		this.mouse = new T.Vector2(0, 0);
		this.prevMouse = new T.Vector2(0, 0);
		this.currentWave = 0;

		this.isPlaying = true;

		this.loadObjects().then(() => {
			this.mouseEvents();
			this.addObjects();
			this.resize();
			this.render();
			this.setupResize();
		});
	}

	settings() {
		let that = this;
		this.settings = {
			progress: 0,
		};
		this.gui = new dat.GUI();
		this.gui.add(this.settings, 'progress', 0, 1, 0.01);
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	loadObjects() {
		const loader = new T.FileLoader();

		const fragment = new Promise((resolve, reject) => {
			loader.load(
				'./shader/fragment.glsl',
				(data) => {
					this.fragment = data;
					resolve();
				},
				() => {},
				(err) => {
					console.log(err);
					reject();
				},
			);
		});

		const vertex = new Promise((resolve, reject) => {
			loader.load(
				'./shader/vertex.glsl',
				(data) => {
					this.vertex = data;
					resolve();
				},
				() => {},
				(err) => {
					console.log(err);
					reject();
				},
			);
		});

		return Promise.all([fragment, vertex]);
	}

	addObjects() {
		let that = this;

		this.material = new T.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable',
			},
			side: T.DoubleSide,
			uniforms: {
				time: { type: 'f', value: 0 },
				resolution: { type: 'v4', value: new T.Vector4() },
				uDisplacement: { value: null },
				uTexture: { value: new T.TextureLoader().load(image) },
				// uvRate1: {
				// 	value: new T.Vector2(1, 1),
				// },
			},
			// wireframe: true,
			// transparent: true,
			vertexShader: this.vertex,
			fragmentShader: this.fragment,
		});

		this.maxWaves = 150;
		this.geometry = new T.PlaneGeometry(86, 86, 1, 1);
		this.geometryFullscreen = new T.PlaneGeometry(this.width, this.height, 1, 1);

		this.meshes = [];

		for (let i = 0; i < this.maxWaves; i += 1) {
			const material = new T.MeshBasicMaterial({
				map: new T.TextureLoader().load(brush),
				transparent: true,
				blending: T.AdditiveBlending,
				depthTest: false,
				depthWrite: false,
			});

			const mesh = new T.Mesh(this.geometry, material);
			// mesh.visible = false;
			mesh.rotation.z = 2 * Math.PI * Math.random();

			this.scene.add(mesh);
			this.meshes.push(mesh);
		}

		this.quad = new T.Mesh(this.geometryFullscreen, this.material);
		this.sceneSecond.add(this.quad);
	}

	stop() {
		this.isPlaying = false;
	}

	play() {
		if (!this.isPlaying) {
			this.render();
			this.isPlaying = true;
		}
	}

	setNewWave(x, y, index) {
		this.meshes[index].visible = true;
		this.meshes[index].position.x = x;
		this.meshes[index].position.y = y;
		this.meshes[index].material.opacity = 0.5;
		this.meshes[index].scale.x = 0.15;
		this.meshes[index].scale.y = 0.15;
	}

	mouseEvents() {
		window.addEventListener('mousemove', (e) => {
			this.mouse.x = e.clientX - this.width / 2;
			this.mouse.y = this.height / 2 - e.clientY;
		});
	}

	trackMousePos() {
		if (!(Math.abs(this.mouse.x - this.prevMouse.x) < 4 && Math.abs(this.mouse.y - this.prevMouse.y) < 4)) {
			this.setNewWave(this.mouse.x, this.mouse.y, this.currentWave);
			this.currentWave = (this.currentWave + 1) % this.maxWaves;
		}
		this.prevMouse.x = this.mouse.x;
		this.prevMouse.y = this.mouse.y;
	}

	render() {
		this.trackMousePos();
		if (!this.isPlaying) return;
		this.time += 0.05;
		// this.material.uniforms.time.value = this.time;
		window.requestAnimationFrame(this.render.bind(this));

		this.renderer.setRenderTarget(this.baseTexture);
		this.renderer.render(this.scene, this.camera);
		this.material.uniforms.uDisplacement.value = this.baseTexture.texture;
		this.renderer.setRenderTarget(null);
		this.renderer.clear();
		this.renderer.render(this.sceneSecond, this.camera);

		this.meshes.forEach((mesh) => {
			if (!mesh.visible) return;
			const m = mesh;
			// m.position.x = this.mouse.x;
			// m.position.y = this.mouse.y;
			m.rotation.z += 0.02;
			m.material.opacity *= 0.96;
			m.scale.x = m.scale.x * 0.982 + 0.108;
			m.scale.y = m.scale.x;

			if (m.material.opacity < 0.002) m.visible = false;
		});
	}
}
