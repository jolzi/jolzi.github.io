import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.142.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.142.0/examples/jsm/loaders/GLTFLoader.js';
import { AudioLoader, AudioListener, PositionalAudio } from 'https://cdn.jsdelivr.net/npm/three@0.142.0/build/three.module.js';

// The rest of your code...

const setSize = 15;
const mutationProbability = 0.70;
const mutationSpan = 1.5;
const collisionWeight = 1;

let camera, scene, renderer, clock;
let population;
let lukas, lukasCollider, lukasColliderPosition;
let isFinished = false;
let fittest, secondFittest;
let generationIndex = 1;

init();
animate();

function init() {
    // Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(-5, 2, -5);

    // Clock setup
    clock = new THREE.Clock();

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Light setup
    const light = new THREE.HemisphereLight(0xbbbbff, 0x444422);
    light.position.set(0, 1, 0);
    scene.add(light);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // Event listener for window resize
    window.addEventListener('resize', onWindowResize, false);

    // Orbit Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 1);
    controls.update();

    // Audio setup
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sounds = setupAudio(listener);

    // Update the generation display
    document.getElementById("generation").innerHTML = "Generation: " + generationIndex;

    // Load models
    const loader = new GLTFLoader();
    loader.load('../threejs/data/Lukas.glb', function (gltf) {
        lukas = gltf.scene;
        lukasCollider = lukas.getObjectByName('LukasCollider');
        lukasCollider.material.transparent = true;
        scene.add(lukas);

        lukasCollider.add(sounds[0]);

        lukasColliderPosition = new THREE.Vector3();
        lukasColliderPosition.setFromMatrixPosition(lukasCollider.matrixWorld);
    });

    loader.load('../threejs/data/MuscHammer.glb', function (gltf) {
        setUpPersons(gltf, sounds);
    });
}

function setupAudio(listener) {
    const sounds = [];
    const audioLoader = new THREE.AudioLoader();

    for (let i = 1; i <= 4; i++) {
        const sound = new THREE.PositionalAudio(listener);
        audioLoader.load(`../threejs/data/bell${i}.mp3`, function (buffer) {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(1.3);
        });
        sounds.push(sound);
    }

    return sounds;
}

function setUpPersons(gltf, sounds) {
    const persons = [];
    for (let i = 0; i < setSize; i++) {
        persons[i] = new Person();

        if (i === 0) {
            persons[i].mesh = gltf.scene;
        } else {
            persons[i].mesh = gltf.scene.clone(true);
            makeInvisible(persons[i].mesh, gltf.scene);
        }

        persons[i].rightArm = persons[i].mesh.getObjectByName('Bone');
        persons[i].collider = persons[i].mesh.getObjectByName('Collider');
        persons[i].collider.material.transparent = true;

        const rotationKF = new THREE.QuaternionKeyframeTrack('.quaternion', persons[i].times, persons[i].values);
        persons[i].tracks = [rotationKF];

        const length = -1;
        persons[i].clip = new THREE.AnimationClip('rotate', length, persons[i].tracks);
        persons[i].mixer = new THREE.AnimationMixer(persons[i].rightArm);
        persons[i].action = persons[i].mixer.clipAction(persons[i].clip);

        persons[i].action.setLoop(THREE.LoopOnce);
        persons[i].action.play();

        scene.add(persons[i].mesh);
    }

    persons[setSize - 1].mixer.addEventListener('finished', populationFinished);
    population = new Population(persons, lukasCollider, setSize, collisionWeight, sounds);
}

function makeInvisible(mesh, originalScene) {
    const materialsToClone = ['Object1', '11685_hammer_v1_L3_1', '11685_hammer_v1_L3_2'];
    materialsToClone.forEach(name => {
        const material = originalScene.getObjectByName(name).material.clone();
        material.transparent = true;
        material.opacity = 0;
        mesh.getObjectByName(name).material = material;
    });
}

function populationFinished() {
    isFinished = true;
    selection();
    const newPersons = crossover();
    const mutatedNewPersons = mutation(newPersons);
    updatePopulation(mutatedNewPersons);
    population.resetFitness();
    population.persons[population.persons.length - 1].mixer.addEventListener('finished', populationFinished);
    generationIndex++;
    document.getElementById("generation").innerHTML = "Generation: " + generationIndex;
    document.getElementById("hits").innerHTML = "Hits: 0";
}

function selection() {
    fittest = population.getFittest();
    secondFittest = population.getSecondFittest();
}

function crossover() {
    let newPersons = [];
    newPersons.push(fittest.values);
    newPersons.push(secondFittest.values);

    newPersons.push(fittest.getRandomValues());
    newPersons.push(fittest.getRandomValues());

    for (let i = newPersons.length; i < setSize; i++) {
        let newPersonValues = [];

        for (let j = 0; j < fittest.geneLength; j += 4) {
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
    }
    return newPersons;
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