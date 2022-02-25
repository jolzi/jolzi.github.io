class Population {
    persons = [];
    fittest = 5000;
    target;
    targetCollider;
    iteration = 0;
    previousCollision = [];
    collisionWeight;
    currentFitnessFrame = 0;
    soundIndex = 0;
    sound;

    constructor(initialPersons, targetCollider, popSize, collisionWeight, sounds) {
        this.persons = initialPersons;
        this.targetCollider = targetCollider;

        this.target = new THREE.Vector3();
        this.target.setFromMatrixPosition(targetCollider.matrixWorld);
        this.popSize = popSize;
        this.collisionWeight = collisionWeight;

        this.sounds = sounds;
    }

    setPersons(newPersons) {
        this.persons = newPersons;
    }

    calculateFitness() {
        let position;
        let distance;

        if(this.persons[0].checkingTimes[this.currentFitnessFrame] <= this.persons[0].mixer.time) this.currentFitnessFrame++;
        for (let i = 0; i < this.popSize; i++) {


            this.persons[i].mixer.update(1);

            //Fitness function
            position = new THREE.Vector3();
            position.setFromMatrixPosition(this.persons[i].collider.matrixWorld);

            distance = position.distanceTo(this.target);

            if (distance < this.persons[i].fitness[this.currentFitnessFrame]) {
                this.persons[i].fitness[this.currentFitnessFrame] = distance;
            }

            //Collision detection
            if(distance < 0.7) this.checkTouching(this.persons[i], i);
        }
        this.iteration++;
    }

    resetFitness() {
        for (let i = 0; i < this.persons.length; i++) {
            this.persons[i].fitness = this.persons[i].defaultFitness.slice(0);
            this.persons[i].collisionCount = 0;
            this.persons[i].previousCollision = false;
            this.persons[i].collisionTimeout = 0;
        }
        this.currentFitnessFrame = 0;
        this.soundIndex = 0;
    }

    //https://stackoverflow.com/questions/11473755/how-to-detect-collision-in-three-js
    checkTouching(person, i) {

        //TODO: Implement cooldown on collision
        let box1 = person.collider;
        let box2 = this.targetCollider;
        box1.updateMatrixWorld();
        box2.updateMatrixWorld();

        //console.log(box1);

        let bounding1 = new THREE.Box3();
        let bounding2 = new THREE.Box3();

        bounding1.setFromObject(box1, true);
        bounding2.setFromObject(box2);

        if (bounding1.intersectsBox(bounding2)) {
            if (!person.previousCollision && person.collisionTimeout === 0) {
                person.previousCollision = true;
                person.collisionTimeout = 20;
                person.collisionCount++;

                person.fitness[this.currentFitnessFrame] -= this.collisionWeight;

                if (i === 0) {
                    //console.log("Collision");

                    if (!this.sounds[this.soundIndex].isPlaying) {
                        this.sounds[this.soundIndex].play();
                    }else{
                        this.sounds[this.soundIndex].currentTime = 0
                    }

                    if(this.soundIndex < this.sounds.length - 1)
                    {
                        this.soundIndex++;
                    }
                    else{
                        this.soundIndex = 0;
                    }
                }
            }
        }

        else {
            person.previousCollision = false;
            if (person.collisionTimeout > 0) person.collisionTimeout--;
        }
        if (i=== 0)
        {
            document.getElementById("hits").innerHTML = "Hits: " + person.collisionCount; 
        }

    }

    computeFitness(fitnessArray)
    {
        return fitnessArray.reduce((partialSum, a) => partialSum + a, 0);
    }

    getFittest() {
        let maxFit = 5000;

        let maxFitIndex = 0;


        let personsFitness;
        for (let i = 0; i < this.persons.length; i++) {
            personsFitness = this.computeFitness(this.persons[i].fitness);
            if (maxFit >= personsFitness) {
                maxFit = personsFitness;
                maxFitIndex = i;
            }
        }
        if(this.computeFitness(this.persons[maxFitIndex].fitness) > this.fittest) {
            console.log("decreased");
        } 
        this.fittest = this.computeFitness(this.persons[maxFitIndex].fitness);
        console.log(this.fittest);

        return this.persons[maxFitIndex];
    }

    getSecondFittest() {
        let maxFit1 = 0;
        let maxFit2 = 0;

        let personsFitness;
        for (let i = 0; i < this.persons.length; i++) {
            personsFitness = this.computeFitness(this.persons[i].fitness);
            if (personsFitness < this.computeFitness(this.persons[maxFit1].fitness)) {
                maxFit2 = maxFit1;
                maxFit1 = i;
            } else if (personsFitness < this.computeFitness(this.persons[maxFit2].fitness)) {
                maxFit2 = i;
            }
        }
        return this.persons[maxFit2];
    }
}