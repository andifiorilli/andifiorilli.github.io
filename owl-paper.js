document.addEventListener("DOMContentLoaded", function () {
    const canvases = document.querySelectorAll(".owl-canvas");

    if (!canvases.length) return;

    function initializeCanvas(canvas) {
    const stage = canvas.closest(".owl-stage");
    const sequence = canvas.closest(".owl-sequence");

    if (!stage || !sequence) return;

    const imagePaths = canvas.dataset.images
        .split(",")
        .map(function (path) {
            return path.trim();
        })
        .filter(Boolean);

    if (imagePaths.length < 2) return;

    const gl =
        canvas.getContext("webgl", {
            alpha: false,
            antialias: false
        }) ||
        canvas.getContext("experimental-webgl", {
            alpha: false,
            antialias: false
        });

    if (!gl) return;

    const vertexShaderSource = `
        attribute vec2 aPosition;
        varying vec2 vUv;

        void main() {
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const fragmentShaderSource = `
        precision highp float;

        uniform sampler2D uTextureFrom;
        uniform sampler2D uTextureTo;

        uniform float uProgress;
        uniform float uCanvasAspect;
        uniform float uImageAspect;

        varying vec2 vUv;

        float random(vec2 point) {
            return fract(
                sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453
            );
        }

        vec2 containUv(vec2 uv) {
            vec2 result = uv;

            if (uCanvasAspect > uImageAspect) {
                float visibleWidth = uImageAspect / uCanvasAspect;
                float margin = (1.0 - visibleWidth) * 0.5;

                result.x = (uv.x - margin) / visibleWidth;
            } else {
                float visibleHeight = uCanvasAspect / uImageAspect;
                float margin = (1.0 - visibleHeight) * 0.5;

                result.y = (uv.y - margin) / visibleHeight;
            }

            return result;
        }

        bool outsideImage(vec2 uv) {
            return (
                uv.x < 0.0 ||
                uv.x > 1.0 ||
                uv.y < 0.0 ||
                uv.y > 1.0
            );
        }

        void main() {
            vec2 uv = containUv(vUv);

            if (outsideImage(uv)) {
                gl_FragColor = vec4(0.067, 0.067, 0.067, 1.0);
                return;
            }

            float transitionStrength =
                sin(uProgress * 3.14159265);

            float horizontalWave =
                sin(uv.y * 18.0 + uProgress * 6.0) * 0.018;

            float verticalWave =
                cos(uv.x * 14.0 - uProgress * 5.0) * 0.012;

            vec2 displacedFrom = uv;
            vec2 displacedTo = uv;

            displacedFrom.x +=
                horizontalWave * transitionStrength * uProgress;

            displacedFrom.y -=
                verticalWave * transitionStrength * uProgress;

            displacedTo.x -=
                horizontalWave *
                transitionStrength *
                (1.0 - uProgress);

            displacedTo.y +=
                verticalWave *
                transitionStrength *
                (1.0 - uProgress);

            float grain = random(
                floor(uv * 180.0) +
                vec2(uProgress * 17.0)
            );

            float transitionMap =
                uv.x +
                sin(uv.y * 10.0) * 0.055 +
                (grain - 0.5) * 0.12;

            float threshold =
                uProgress * 1.3 - 0.15;

            float edge =
                1.0 -
                smoothstep(
                    threshold - 0.12,
                    threshold + 0.12,
                    transitionMap
                );

            vec4 fromColor =
                texture2D(uTextureFrom, displacedFrom);

            vec4 toColor =
                texture2D(uTextureTo, displacedTo);

            vec4 color = mix(fromColor, toColor, edge);

            float surfaceGrain =
                (grain - 0.5) *
                0.055 *
                transitionStrength;

            color.rgb += surfaceGrain;

            gl_FragColor = vec4(color.rgb, 1.0);
        }
    `;

    function createShader(type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function createProgram(vertexSource, fragmentSource) {
        const vertexShader = createShader(
            gl.VERTEX_SHADER,
            vertexSource
        );

        const fragmentShader = createShader(
            gl.FRAGMENT_SHADER,
            fragmentSource
        );

        if (!vertexShader || !fragmentShader) return null;

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    function loadImage(path) {
        return new Promise(function (resolve, reject) {
            const image = new Image();

            image.onload = function () {
                resolve(image);
            };

            image.onerror = reject;
            image.src = path;
        });
    }

    function createTexture(image) {
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.LINEAR
        );

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        return texture;
    }

    const program = createProgram(
        vertexShaderSource,
        fragmentShaderSource
    );

    if (!program) return;

    const positionLocation = gl.getAttribLocation(
        program,
        "aPosition"
    );

    const progressLocation = gl.getUniformLocation(
        program,
        "uProgress"
    );

    const canvasAspectLocation = gl.getUniformLocation(
        program,
        "uCanvasAspect"
    );

    const imageAspectLocation = gl.getUniformLocation(
        program,
        "uImageAspect"
    );

    const textureFromLocation = gl.getUniformLocation(
        program,
        "uTextureFrom"
    );

    const textureToLocation = gl.getUniformLocation(
        program,
        "uTextureTo"
    );

    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ]),
        gl.STATIC_DRAW
    );

    let images;
    let textures;
    let imageAspect;
    let needsRender = true;
    let isReady = false;

    function resizeCanvas() {
        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        const width = Math.round(
            canvas.clientWidth * pixelRatio
        );

        const height = Math.round(
            canvas.clientHeight * pixelRatio
        );

        if (
            canvas.width !== width ||
            canvas.height !== height
        ) {
            canvas.width = width;
            canvas.height = height;

            gl.viewport(0, 0, width, height);
            needsRender = true;
        }
    }

    function getScrollProgress() {
        const rect = sequence.getBoundingClientRect();
        const stickyHeight = stage.offsetHeight;
        const stickyTop =
            parseFloat(window.getComputedStyle(stage).top) || 0;

        const scrollDistance = rect.height - stickyHeight;

        if (scrollDistance <= 0) return 0;

        return Math.min(
            Math.max(
                (stickyTop - rect.top) / scrollDistance,
                0
            ),
            1
        );
    }

    function render() {
        if (!isReady) return;

        resizeCanvas();

        const overallProgress = getScrollProgress();
        const transitionCount = textures.length - 1;

        const scaledProgress =
            overallProgress * transitionCount;

        const fromIndex = Math.min(
            Math.floor(scaledProgress),
            transitionCount - 1
        );

        const toIndex = fromIndex + 1;

        const progress =
            scaledProgress - fromIndex;

        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.enableVertexAttribArray(positionLocation);

        gl.vertexAttribPointer(
            positionLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(
            gl.TEXTURE_2D,
            textures[fromIndex]
        );

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(
            gl.TEXTURE_2D,
            textures[toIndex]
        );

        gl.uniform1i(textureFromLocation, 0);
        gl.uniform1i(textureToLocation, 1);

        gl.uniform1f(progressLocation, progress);

        gl.uniform1f(
            canvasAspectLocation,
            canvas.width / canvas.height
        );

        gl.uniform1f(
            imageAspectLocation,
            imageAspect
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (!stage.classList.contains("is-webgl-ready")) {
            stage.classList.add("is-webgl-ready");
        }

        needsRender = false;
    }

    function requestRender() {
        if (needsRender) return;

        needsRender = true;

        window.requestAnimationFrame(function () {
            render();
        });
    }

    Promise.all(imagePaths.map(loadImage))
        .then(function (loadedImages) {
            images = loadedImages;
            textures = images.map(createTexture);

            imageAspect =
                images[0].width / images[0].height;

            isReady = true;
            render();
        })
        .catch(function (error) {
            console.error(
                "Owl Paper WebGL images could not be loaded.",
                error
            );
        });

    window.addEventListener("scroll", requestRender, {
        passive: true
    });

        window.addEventListener("resize", requestRender);
    }

    const canvasObserver = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                initializeCanvas(entry.target);
                canvasObserver.unobserve(entry.target);
            });
        },
        {
            rootMargin: "150% 0px"
        }
    );

    canvases.forEach(function (canvas) {
        canvasObserver.observe(canvas);
    });
});