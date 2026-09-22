(function () {
	'use strict';

	const screen = document.querySelector('#welcomeScreen');
	const canvas = document.querySelector('#welcomeGalaxy');
	const button = document.querySelector('#welcomeButton');
	const status = document.querySelector('#welcomeStatus');
	const audio = document.querySelector('#audioElement');
	const audioError = document.querySelector('#audioError');
	const phrases = ['Neyla Natividad', 'Mi persona favorita', 'Un sol para ti', 'Por siempre', 'Contigo todo es mejor'];
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let animationFrame;
	let started = false;
	let journeyFinished = false;

	if (audio) {
		audio.pause();
		audio.currentTime = 0;
	}

	function textureCanvas(width, height, draw) {
		const texture = document.createElement('canvas');
		texture.width = width;
		texture.height = height;
		draw(texture.getContext('2d'), width, height);
		return texture;
	}

	function flowerTexture() {
		return textureCanvas(220, 220, (context) => {
			context.translate(110, 110);
			for (let index = 0; index < 12; index += 1) {
				context.save();
				context.rotate(index * Math.PI / 6);
				context.fillStyle = '#ffd449';
				context.shadowColor = '#ffbd29';
				context.shadowBlur = 20;
				context.beginPath();
				context.ellipse(0, -57, 20, 48, 0, 0, Math.PI * 2);
				context.fill();
				context.restore();
			}
			context.shadowBlur = 0;
			context.fillStyle = '#6d3c17';
			context.beginPath();
			context.arc(0, 0, 31, 0, Math.PI * 2);
			context.fill();
			context.fillStyle = '#ffe9a0';
			context.beginPath();
			context.arc(-9, -8, 3, 0, Math.PI * 2);
			context.arc(9, -8, 3, 0, Math.PI * 2);
			context.fill();
		});
	}

	function textTexture(text) {
		return textureCanvas(720, 120, (context, width, height) => {
			context.font = '600 31px "DM Sans", sans-serif';
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillStyle = '#ffe99b';
			context.shadowColor = '#ffc22e';
			context.shadowBlur = 22;
			context.fillText(text, width / 2, height / 2);
		});
	}

	function glowTexture() {
		return textureCanvas(256, 256, (context, width, height) => {
			const gradient = context.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, width / 2);
			gradient.addColorStop(0, 'rgba(255,255,225,1)');
			gradient.addColorStop(.15, 'rgba(255,225,101,.95)');
			gradient.addColorStop(.45, 'rgba(255,178,35,.35)');
			gradient.addColorStop(1, 'rgba(255,150,20,0)');
			context.fillStyle = gradient;
			context.fillRect(0, 0, width, height);
		});
	}

	function createThreeJourney() {
		if (!window.THREE) return false;
		const scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0x02040d, .012);
		const camera = new THREE.PerspectiveCamera(window.innerWidth < 600 ? 70 : 58, 1, .1, 160);
		const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
		renderer.setClearColor(0x02040d, 1);
		camera.position.set(0, 0, 8);
		const objects = [];
		const speedLines = [];
		const glowMap = new THREE.CanvasTexture(glowTexture());
		const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xffbc38, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
		sun.position.set(0, 0, -72);
		sun.scale.set(28, 28, 1);
		scene.add(sun);
		const innerSun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xfff2a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
		innerSun.position.set(0, 0, -70);
		innerSun.scale.set(9, 9, 1);
		scene.add(innerSun);

		const addSprite = (texture, scale, index) => {
			const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
				map: new THREE.CanvasTexture(texture),
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			}));
			sprite.position.set((Math.random() - .5) * 23, (Math.random() - .5) * 15, -10 - Math.random() * 65);
			sprite.scale.set(scale, scale * texture.height / texture.width, 1);
			scene.add(sprite);
			objects.push({ sprite, index, baseX: sprite.position.x });
		};
		for (let index = 0; index < 38; index += 1) {
			addSprite(textTexture(phrases[index % phrases.length]), .85 + Math.random() * .8, index);
			if (index < 22) addSprite(flowerTexture(), .6 + Math.random() * .7, index + 40);
		}

		const linePositions = new Float32Array(420 * 6);
		const lineGeometry = new THREE.BufferGeometry();
		lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffd45b, transparent: true, opacity: .58, blending: THREE.AdditiveBlending });
		const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
		scene.add(lines);
		for (let index = 0; index < 420; index += 1) speedLines.push({ x: (Math.random() - .5) * 46, y: (Math.random() - .5) * 30, z: -Math.random() * 100, length: .15 + Math.random() * .45 });

		const resize = () => {
			renderer.setSize(window.innerWidth, window.innerHeight, false);
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.fov = window.innerWidth < 600 ? 70 : 58;
			camera.updateProjectionMatrix();
		};
		const finishJourney = () => {
			if (journeyFinished) return;
			journeyFinished = true;
			const flash = document.createElement('div');
			flash.className = 'welcome-flash';
			document.body.appendChild(flash);
			window.setTimeout(() => {
				document.body.classList.remove('welcome-active');
				screen.setAttribute('aria-hidden', 'true');
				screen.classList.add('is-leaving');
				window.cancelAnimationFrame(animationFrame);
				window.setTimeout(() => flash.remove(), 1100);
			}, 420);
		};
		const animate = (time) => {
			const elapsed = (time - startTime) / 1000;
			const progress = Math.min(1, elapsed / (reducedMotion ? 3 : 9));
			const eased = progress * progress * (3 - 2 * progress);
			const speed = reducedMotion ? .12 : .018 + eased * .82;
			camera.position.z -= speed;
			camera.position.x = Math.sin(time * .00045) * eased * .7;
			camera.position.y = Math.cos(time * .00031) * eased * .42;
			camera.lookAt(0, 0, -72);
			objects.forEach(({ sprite, index, baseX }) => {
				sprite.position.z += speed * (index % 3 === 0 ? 1.18 : .92);
				sprite.position.x = baseX + Math.sin(time * .0007 + index) * (.18 + eased * .42);
				sprite.rotation.z += (index % 2 ? .006 : -.006) * Math.max(.35, eased);
				if (sprite.position.z > 8) sprite.position.z = -76 - Math.random() * 32;
			});
			speedLines.forEach((line, index) => {
				line.z += speed * (index % 4 === 0 ? 1.8 : 1.25);
				if (line.z > 7) line.z = -100 - Math.random() * 45;
				const offset = index * 6;
				linePositions[offset] = line.x;
				linePositions[offset + 1] = line.y;
				linePositions[offset + 2] = line.z;
				linePositions[offset + 3] = line.x;
				linePositions[offset + 4] = line.y;
				linePositions[offset + 5] = line.z - line.length * (1 + eased * 12);
			});
			lineGeometry.attributes.position.needsUpdate = true;
			lineMaterial.opacity = .22 + eased * .7;
			sun.scale.setScalar(25 + eased * 32);
			innerSun.scale.setScalar(8 + eased * 18);
			renderer.render(scene, camera);
			if (progress >= 1) finishJourney();
			else animationFrame = window.requestAnimationFrame(animate);
		};
		let startTime = performance.now();
		window.addEventListener('resize', resize);
		resize();
		animationFrame = window.requestAnimationFrame(animate);
		return true;
	}

	function createCanvasFallback() {
		const context = canvas.getContext('2d');
		const stars = Array.from({ length: 180 }, (_, index) => ({ x: Math.random(), y: Math.random(), z: Math.random(), text: index % 9 === 0 ? phrases[index % phrases.length] : '' }));
		const resize = () => { canvas.width = window.innerWidth * window.devicePixelRatio; canvas.height = window.innerHeight * window.devicePixelRatio; };
		const startTime = performance.now();
		const animate = (time) => {
			const progress = Math.min(1, (time - startTime) / (reducedMotion ? 3000 : 9000));
			const speed = reducedMotion ? .003 : .001 + progress * .012;
			const width = window.innerWidth;
			const height = window.innerHeight;
			context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
			context.fillStyle = '#02040d';
			context.fillRect(0, 0, width, height);
			stars.forEach((star) => {
				star.z -= speed;
				if (star.z < 0) star.z = 1;
				const scale = 1 - star.z;
				const x = width / 2 + (star.x - .5) * width * scale;
				const y = height / 2 + (star.y - .5) * height * scale;
				const trail = 3 + progress * 70 * scale;
				context.strokeStyle = `rgba(255,215,102,${.2 + scale * .8})`;
				context.lineWidth = 1 + scale * 2;
				context.beginPath();
				context.moveTo(x, y);
				context.lineTo(x, y - trail);
				context.stroke();
				if (star.text && scale > .35) { context.font = `${10 + scale * 18}px sans-serif`; context.textAlign = 'center'; context.fillStyle = '#ffe58a'; context.fillText(star.text, x, y); }
			});
			if (progress >= 1) {
				document.body.classList.remove('welcome-active');
				screen.setAttribute('aria-hidden', 'true');
				screen.classList.add('is-leaving');
			} else animationFrame = window.requestAnimationFrame(animate);
		};
		window.addEventListener('resize', resize);
		resize();
		animationFrame = window.requestAnimationFrame(animate);
	}

	function startJourney() {
		if (started) return;
		started = true;
		button.hidden = true;
		status.textContent = 'PREPARANDO...';

		try {
			if (!createThreeJourney()) createCanvasFallback();
		} catch (error) {
			console.warn('No se pudo iniciar Three.js; se usará el respaldo Canvas:', error);
			createCanvasFallback();
		}

	}

	button.addEventListener('click', startJourney);
}());
