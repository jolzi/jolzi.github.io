class Person {
    times;
    id;
    values;
    tracks;
    clip;
    mixer;
    action;
    mesh;
    rightArm;
    collider;
    fitness = [];
    defaultFitness = [];
    checkingTimes = [];
    geneLength;
    previousCollision;
    collisionTimeout;
    collisionCount;
    constructor() {
        this.minDistance = 1000000;

        this.times = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360];

        //For Random initialization (aka no parameters passed)
        if (!arguments.length) {
            this.values = [];

            let a = new THREE.Euler(0, 0, 0, 'XYZ');
            let aQuaternion = new THREE.Quaternion();
            aQuaternion.setFromEuler(a);

            this.values.push(aQuaternion.x, aQuaternion.y, aQuaternion.z, aQuaternion.w);

            const TWO_PI = Math.PI * 2;

            for (let i = 0; i < this.times.length - 1; i++) {
                a = new THREE.Euler(Math.random() * TWO_PI, Math.random() * TWO_PI, Math.random() * TWO_PI);
                aQuaternion = new THREE.Quaternion();
                aQuaternion.setFromEuler(a);
                this.values.push(aQuaternion.x, aQuaternion.y, aQuaternion.z, aQuaternion.w);
            }

            for(let i = 1; i < this.times.length -1; i+=2)
            {
                this.checkingTimes.push(this.times[i]);
                this.defaultFitness.push(5000);
            }

            this.fitness = this.defaultFitness.slice(0);

        }
        else {
            this.values = quaternionValues;
        }

        this.geneLength = this.values.length;
        this.previousCollision = false;
        this.collisionTimeout = 0;
        this.collisionCount = 0;
    }

    getRandomValues()
    {
        let randomValues = [];

        let a = new THREE.Euler(0, 0, 0, 'XYZ');
        let aQuaternion = new THREE.Quaternion();
        aQuaternion.setFromEuler(a);

        randomValues.push(aQuaternion.x, aQuaternion.y, aQuaternion.z, aQuaternion.w);

        const TWO_PI = Math.PI * 2;
        
        for (let i = 0; i < this.times.length - 1; i++) {
            a = new THREE.Euler(Math.random() * TWO_PI, Math.random() * TWO_PI, Math.random() * TWO_PI);
            aQuaternion = new THREE.Quaternion();
            aQuaternion.setFromEuler(a);
            randomValues.push(aQuaternion.x, aQuaternion.y, aQuaternion.z, aQuaternion.w);
        }

        return randomValues;
    }

}