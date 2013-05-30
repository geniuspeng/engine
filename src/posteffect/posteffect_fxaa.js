pc.extend(pc.posteffect, function () {

    function Fxaa(graphicsDevice) {
        this.device = graphicsDevice;

        // Shaders
        var attributes = {
            aPosition: pc.gfx.SEMANTIC_POSITION
        };

        var passThroughVert = [
            "attribute vec2 aPosition;",
            "",
            "void main(void)",
            "{",
            "    gl_Position = vec4(aPosition, 0.0, 1.0);",
            "}"
        ].join("\n");

        var fxaaFrag = [
            "precision mediump float;",
            "",
            "uniform sampler2D tDiffuse;",
            "uniform vec2 resolution;",
            "",
            "#define FXAA_REDUCE_MIN   (1.0/128.0)",
            "#define FXAA_REDUCE_MUL   (1.0/8.0)",
            "#define FXAA_SPAN_MAX     8.0",
            "",
            "void main()",
            "{",
            "    vec3 rgbNW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) * resolution ).xyz;",
            "    vec3 rgbNE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) * resolution ).xyz;",
            "    vec3 rgbSW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) * resolution ).xyz;",
            "    vec3 rgbSE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) * resolution ).xyz;",
            "    vec4 rgbaM  = texture2D( tDiffuse,  gl_FragCoord.xy  * resolution );",
            "    vec3 rgbM  = rgbaM.xyz;",
            "    float opacity  = rgbaM.w;",
            "",
            "    vec3 luma = vec3( 0.299, 0.587, 0.114 );",
            "",
            "    float lumaNW = dot( rgbNW, luma );",
            "    float lumaNE = dot( rgbNE, luma );",
            "    float lumaSW = dot( rgbSW, luma );",
            "    float lumaSE = dot( rgbSE, luma );",
            "    float lumaM  = dot( rgbM,  luma );",
            "    float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );",
            "    float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );",
            "",
            "    vec2 dir;",
            "    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));",
            "    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));",
            "",
            "    float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );",
            "",
            "    float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );",
            "    dir = min( vec2( FXAA_SPAN_MAX, FXAA_SPAN_MAX), max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * resolution;",
            "",
            "    vec3 rgbA = 0.5 * (",
            "        texture2D( tDiffuse, gl_FragCoord.xy  * resolution + dir * ( 1.0 / 3.0 - 0.5 ) ).xyz +",
            "        texture2D( tDiffuse, gl_FragCoord.xy  * resolution + dir * ( 2.0 / 3.0 - 0.5 ) ).xyz );",
            "",
            "    vec3 rgbB = rgbA * 0.5 + 0.25 * (",
            "        texture2D( tDiffuse, gl_FragCoord.xy  * resolution + dir * -0.5 ).xyz +",
            "        texture2D( tDiffuse, gl_FragCoord.xy  * resolution + dir * 0.5 ).xyz );",
            "",
            "    float lumaB = dot( rgbB, luma );",
            "",
            "    if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) )",
            "    {",
            "        gl_FragColor = vec4( rgbA, opacity );",
            "    }",
            "    else",
            "    {",
            "        gl_FragColor = vec4( rgbB, opacity );",
            "    }",
            "}"
        ].join("\n");

        this.fxaaShader = new pc.gfx.Shader(graphicsDevice, {
            attributes: attributes,
            vshader: passThroughVert,
            fshader: fxaaFrag
        });

        // Create the vertex format
        var vertexFormat = new pc.gfx.VertexFormat(graphicsDevice, [
            { semantic: pc.gfx.SEMANTIC_POSITION, components: 2, type: pc.gfx.ELEMENTTYPE_FLOAT32 }
        ]);

        // Create a vertex buffer
        this.vertexBuffer = new pc.gfx.VertexBuffer(graphicsDevice, vertexFormat, 4);

        // Fill the vertex buffer
        var iterator = new pc.gfx.VertexIterator(this.vertexBuffer);
        iterator.element[pc.gfx.SEMANTIC_POSITION].set(-1.0, -1.0);
        iterator.next();
        iterator.element[pc.gfx.SEMANTIC_POSITION].set(1.0, -1.0);
        iterator.next();
        iterator.element[pc.gfx.SEMANTIC_POSITION].set(-1.0, 1.0);
        iterator.next();
        iterator.element[pc.gfx.SEMANTIC_POSITION].set(1.0, 1.0);
        iterator.end();

        // Uniforms
        this.resolution = pc.math.vec2.create(0, 0);
    }

    Fxaa.prototype = {
        render: function (inputTarget, outputTarget) {
            var device = this.device;
            var scope = device.scope;

            pc.math.vec2.set(this.resolution, 1/inputTarget.width, 1/inputTarget.height);
            scope.resolve("resolution").setValue(this.resolution);
            scope.resolve("tDiffuse").setValue(inputTarget.colorBuffer);
            pc.posteffect.drawFullscreenQuad(device, outputTarget, this.vertexBuffer, this.fxaaShader);
        }
    };

    return {
        Fxaa: Fxaa
    };
}());