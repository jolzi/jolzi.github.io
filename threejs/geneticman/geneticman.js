const setSize = 15;
const mutationProbability = 0.70;
const mutationSpan = 1.5;
const collisionWeight = 1;

let camera, scene, renderer, clock, rightArm, collider;
let rotationKF, tracks, length, clip, mixer, model, mesh, action, action2;
let population;

let lukas;
let lukasCollider;
let lukasColliderPosition;

let isFinished = false;

let fittest;
let secondFittest;

let generationIndex = 1;

camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 20);
camera.position.set(-5, 2, -5);


clock = new THREE.Clock();

scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const light = new THREE.HemisphereLight(0xbbbbff, 0x444422);
light.position.set(0, 1, 0);
scene.add(light);

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize, false);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 1);
controls.update();


// create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// create a global audio source
// create a global audio source
const sounds = [];

const sound = new THREE.PositionalAudio(listener);
const sound2 = new THREE.PositionalAudio(listener);
const sound3 = new THREE.PositionalAudio(listener);
const sound4 = new THREE.PositionalAudio(listener);

// load a sound and set it as the Audio object's buffer
const audioLoader = new THREE.AudioLoader();
audioLoader.load('../threejs/data/bell.mp3', function (buffer) {
	sound.setBuffer(buffer);
	sound.setLoop(false);
	sound.setVolume(1.3);
});

audioLoader.load('../threejs/data/bell2.mp3', function (buffer) {
	sound2.setBuffer(buffer);
	sound2.setLoop(false);
	sound2.setVolume(1.3);
});

audioLoader.load('../threejs/data/bell3.mp3', function (buffer) {
	sound3.setBuffer(buffer);
	sound3.setLoop(false);
	sound3.setVolume(1.3);
});

audioLoader.load('../threejs/data/bell4.mp3', function (buffer) {
	sound4.setBuffer(buffer);
	sound4.setLoop(false);
	sound4.setVolume(1.3);
});


const padListener = new THREE.AudioListener();
camera.add(padListener);

const padSound = new THREE.PositionalAudio(padListener);

audioLoader.load('../threejs/data/pad.mp3', function (buffer) {
	padSound.setBuffer(buffer);
	padSound.setLoop(true);
	padSound.setVolume(3.0);
	padSound.play();
});

document.getElementById("generation").innerHTML = "Generation: " + generationIndex;

// model
const loader = new THREE.GLTFLoader();

//Load Hau den Lukas



loader.load('../threejs/data/Lukas.glb', function (gltf) {

	lukas = gltf.scene;
	lukasCollider = lukas.getObjectByName('LukasCollider');
	lukasCollider.material.transparent = true;
	scene.add(lukas);

	lukasCollider.add(sound);
	//console.log(lukasCollider);

	lukasColliderPosition = new THREE.Vector3();
	lukasColliderPosition.setFromMatrixPosition(lukasCollider.matrixWorld);

});

loader.load('../threejs/data/MuscHammer.glb', function (gltf) {

	setUpPersons(gltf);

});

function setUpPersons(gltf) {
	let persons = [];
	for (let i = 0; i < setSize; i++) {

		persons[i] = new Person();


		//TODO: make shit work.

		if (i === 0) {
			persons[i].mesh = gltf.scene;
		} else {
			persons[i].mesh = gltf.scene.clone(true);

			//Make all but one (which will later be the fittest) be invisible;
			persons[i].mesh.getObjectByName('Object1').material = gltf.scene.getObjectByName('Object1').material.clone();
			persons[i].mesh.getObjectByName('Object1').material.transparent = true;
			persons[i].mesh.getObjectByName('Object1').material.opacity = 0;


			persons[i].mesh.getObjectByName('11685_hammer_v1_L3_1').material = gltf.scene.getObjectByName('11685_hammer_v1_L3_1').material.clone();
			persons[i].mesh.getObjectByName('11685_hammer_v1_L3_1').material.transparent = true;
			persons[i].mesh.getObjectByName('11685_hammer_v1_L3_1').material.opacity = 0;

			persons[i].mesh.getObjectByName('11685_hammer_v1_L3_2').material = gltf.scene.getObjectByName('11685_hammer_v1_L3_2').material.clone();
			persons[i].mesh.getObjectByName('11685_hammer_v1_L3_2').material.transparent = true;
			persons[i].mesh.getObjectByName('11685_hammer_v1_L3_2').material.opacity = 0;
		}

		persons[i].rightArm = persons[i].mesh.getObjectByName('Bone');
		//persons[i].rightArm.material.transparent = true;
		persons[i].collider = persons[i].mesh.getObjectByName('Collider');

		persons[i].collider.material.transparent = true;

		let rotationKF = new THREE.QuaternionKeyframeTrack('.quaternion', persons[i].times, persons[i].values);

		persons[i].tracks = [rotationKF];

		let length = -1;

		persons[i].clip = new THREE.AnimationClip('rotate', length, persons[i].tracks);

		persons[i].mixer = new THREE.AnimationMixer(persons[i].rightArm);

		persons[i].action = persons[i].mixer.clipAction(persons[i].clip);

		//persons[i].action.clampWhenFinished = true;

		persons[i].action.setLoop(THREE.LoopOnce);

		persons[i].action.play();

		scene.add(persons[i].mesh);
	}

	persons[setSize - 1].mixer.addEventListener('finished', populationFinished);
	population = new Population(persons, lukasCollider, setSize, collisionWeight, sounds)

}


function populationFinished() {
	isFinished = true;
	selection();
	let newPersons = crossover();
	let mutatedNewPersons = mutation(newPersons);
	updatePopulation(mutatedNewPersons);
	population.resetFitness();
	population.persons[population.persons.length - 1].mixer.addEventListener('finished', populationFinished);
	generationIndex++;
	document.getElementById("generation").innerHTML = "Generation: " + generationIndex;
	document.getElementById("hits").innerHTML = "Hits: 0";
	//console.log('finished');
}

function selection() {
	fittest = population.getFittest();
	secondFittest = population.getSecondFittest();

	//let leastFittest = population.persons[population.getLeastFittestIndex()];
	//console.log(leastFittest.fitness);
}

function crossover() {

	let newPersons = [];

	//Carry over champions
	newPersons.push(fittest.values);
	newPersons.push(secondFittest.values);

	//Generate new random persons
	newPersons.push(fittest.getRandomValues());
	newPersons.push(fittest.getRandomValues());

	//Generate new set of people
	for (let i = newPersons.length; i < setSize; i++) {
		let newPersonValues = [];

		//Iterate over each Quaternion in long form
		for (let j = 0; j < fittest.geneLength; j += 4) {

			// Random crossover Point within an Euler (which has 3 values);
			let crossoverPoint = Math.floor(Math.random() * 3);


			let newPersonQuaternionArray = [fittest.values[j], fittest.values[j + 1], fittest.values[j + 2], fittest.values[j + 3]];
			let newPersonQuaternion = new THREE.Quaternion();
			newPersonQuaternion.set(fittest.values[j], fittest.values[j + 1], fittest.values[j + 2], fittest.values[j + 3]);
			let newPersonEuler = new THREE.Euler();
			newPersonEuler.setFromQuaternion(newPersonQuaternion);

			let newPersonEulerArray = [newPersonEuler.x, newPersonEuler.y, newPersonEuler.z];

			secondFittestGenes = [secondFittest.values[j], secondFittest.values[j + 1], secondFittest.values[j + 2], secondFittest.values[j + 3]];

			let secondFittestQuaternion = new THREE.Quaternion();
			secondFittestQuaternion.set(secondFittest.values[j], secondFittest.values[j + 1], secondFittest.values[j + 2], secondFittest.values[j + 3]);
			let secondFittestEuler = new THREE.Euler();
			secondFittestEuler.setFromQuaternion(secondFittestQuaternion);

			let secondFittestEulerArray = [secondFittestEuler.x, secondFittestEuler.y, secondFittestEuler.z];

			for (let k = 0; k <= crossoverPoint; k++) {
				newPersonEulerArray[k] = secondFittestEulerArray[k];
			}

			newPersonQuaternion.setFromEuler(new THREE.Euler(newPersonEulerArray[0], newPersonEulerArray[1], newPersonEulerArray[2]));

			newPersonValues.push(newPersonQuaternion.x);
			newPersonValues.push(newPersonQuaternion.y);
			newPersonValues.push(newPersonQuaternion.z);
			newPersonValues.push(newPersonQuaternion.w);
		}

		newPersons.push(newPersonValues);
		//console.log(i);
	}
	return newPersons;
	isFinished = false;
}

function mutation(newPersons) {
	for (let i = 2; i < newPersons.length; i++) {
		//Mutate person on certain probability.
		if (Math.random() < mutationProbability) {
			//console.log("Mutation");
			let newPersonEulerArrayLong = []

			//Write QuaternionLong to EulerLong
			for (let j = 0; j < newPersons[i].length; j += 4) {
				let newPersonQuaternion = new THREE.Quaternion();
				newPersonQuaternion.set(newPersons[i][j], newPersons[i][j + 1], newPersons[i][j + 2], newPersons[i][j + 3]);
				let newPersonEuler = new THREE.Euler();
				newPersonEuler.setFromQuaternion(newPersonQuaternion);
				newPersonEulerArrayLong.push(newPersonEuler.x);
				newPersonEulerArrayLong.push(newPersonEuler.y);
				newPersonEulerArrayLong.push(newPersonEuler.z);
			}


			let mutationPoint = Math.floor(Math.random() * newPersonEulerArrayLong.length)

			let b1 = newPersonEulerArrayLong[mutationPoint] - mutationSpan;
			let b2 = newPersonEulerArrayLong[mutationPoint] + mutationSpan;
			let random = Math.random();

			let randomAround = b1 + (random * (b2 - b1));
			newPersonEulerArrayLong[mutationPoint] = randomAround;

			if (Math.random() < mutationProbability) {

				mutationPoint = Math.floor(Math.random() * newPersonEulerArrayLong.length)

				b1 = newPersonEulerArrayLong[mutationPoint] - mutationSpan;
				b2 = newPersonEulerArrayLong[mutationPoint] + mutationSpan;
				random = Math.random();

				randomAround = b1 + (random * (b2 - b1));

				newPersonEulerArrayLong[mutationPoint] = randomAround;

			}



			/*
			if (randomAround > 1.0) randomAround = 1.0;
			if (randomAround < -1.0) randomAround = -1.0;
			newPersonEulerArrayLong[mutationPoint] = randomAround;

			mutationPoint = Math.floor(Math.random() * newPersons[i].length)

			b1 = newPersons[i][mutationPoint] - mutationSpan;
			b2 = newPersons[i][mutationPoint] + mutationSpan;
			random = Math.random();

			randomAround = b1 + (random * (b2 - b1));

			if (randomAround > 1.0) randomAround = 1.0;
			if (randomAround < -1.0) randomAround = -1.0;
			newPersons[i][mutationPoint] = randomAround;

			*/
			let tempNewPersons = [];
			for (let j = 0; j < newPersonEulerArrayLong.length; j += 3) {
				let newPersonQuaternion = new THREE.Quaternion();
				newPersonQuaternion.setFromEuler(new THREE.Euler(newPersonEulerArrayLong[j], newPersonEulerArrayLong[j + 1], newPersonEulerArrayLong[j + 2]));
				tempNewPersons.push(newPersonQuaternion.x);
				tempNewPersons.push(newPersonQuaternion.y);
				tempNewPersons.push(newPersonQuaternion.z);
				tempNewPersons.push(newPersonQuaternion.w);
			}
			newPersons[i] = tempNewPersons;
		}
	}

	return newPersons;
}

function updatePopulation(newPersonValues) {

	for (let i = 0; i < setSize; i++) {

		population.persons[i].action.stop();

		population.persons[i].values = newPersonValues[i];


		let rotationKF = new THREE.QuaternionKeyframeTrack('.quaternion', population.persons[i].times, population.persons[i].values);


		population.persons[i].tracks = [rotationKF];

		let length = -1;


		population.persons[i].clip = new THREE.AnimationClip('rotate', length, population.persons[i].tracks);

		population.persons[i].mixer = new THREE.AnimationMixer(population.persons[i].rightArm);


		population.persons[i].action = population.persons[i].mixer.clipAction(population.persons[i].clip);


		//population.persons[i].action.clampWhenFinished = true;

		population.persons[i].action.setLoop(THREE.LoopOnce);

		population.persons[i].action.play();

		//console.log("updated" + i)

		scene.add(population.persons[i].mesh);

	}

}




function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

	requestAnimationFrame(animate);

	const t = clock.getElapsedTime();

	renderer.render(scene, camera);

	const updateAmount = 1;

	scene.updateMatrixWorld(true);

	population.calculateFitness();

}

animate();