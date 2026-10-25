import { svgDataUrl } from "./render";
import type { GradientDocument, GradientField } from "./types";

export const FIELD_VERTEX = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;

// Continuous scalar fields mapped through a perceptual color ramp. A light
// sheet occupies an area of the frame; there is deliberately no laser core.
export const FIELD_FRAGMENT = `precision highp float;
uniform vec2 resolution;
uniform vec3 colors[6];
uniform float mode, variant, angle, softness, spread, curve, detail, grain, seed, phase;
uniform vec2 center;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 toLab(vec3 c){
 c=pow(max(c,vec3(0.)),vec3(2.2));
 vec3 l=mat3(.4122214708,.2119034982,.0883024619,.5363325363,.6806995451,.2817188376,.0514459929,.1073969566,.6299787005)*c;
 l=pow(max(l,vec3(0.)),vec3(1./3.));
 return mat3(.2104542553,1.9779984951,.0259040371,.793617785,-2.428592205,.7827717662,-.0040720468,.4505937099,-.808675766)*l;
}
vec3 fromLab(vec3 c){
 vec3 l=mat3(1.,1.,1.,.3963377774,-.1055613458,-.0894841775,.2158037573,-.0638541728,-1.291485548)*c;
 l=l*l*l;
 return pow(max(mat3(4.0767416621,-1.2684380046,-.0041960863,-3.3077115913,2.6097574011,-.7034186147,.2309699292,-.3413193965,1.707614701)*l,vec3(0.)),vec3(1./2.2));
}
vec3 ramp(float t){
 t=clamp(t,0.,1.)*5.;
 vec3 a=colors[0],b=colors[1]; float f=t;
 if(t>=4.){a=colors[4];b=colors[5];f=t-4.;}
 else if(t>=3.){a=colors[3];b=colors[4];f=t-3.;}
 else if(t>=2.){a=colors[2];b=colors[3];f=t-2.;}
 else if(t>=1.){a=colors[1];b=colors[2];f=t-1.;}
 return fromLab(mix(toLab(a),toLab(b),smoothstep(0.,1.,f)));
}
vec3 ink(float n){
 n=mod(n,6.);
 if(n<1.)return colors[0];
 if(n<2.)return colors[1];
 if(n<3.)return colors[2];
 if(n<4.)return colors[3];
 if(n<5.)return colors[4];
 return colors[5];
}
vec3 bands(float v,float feather){
 float n=floor(v),f=fract(v);
 return mix(ink(n),ink(n+1.),smoothstep(1.-feather,1.,f));
}
void main(){
 vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
 float aspect=resolution.x/resolution.y;
 vec2 p=(uv-center)*vec2(aspect,1.);
 float ca=cos(angle),sa=sin(angle);
 vec2 q=vec2(ca*p.x+sa*p.y,-sa*p.x+ca*p.y);
 float s=seed*.173;
 float motion=phase;
 float bend=curve*(.18*sin(q.x*1.8+motion*.23+s)+.16*q.x*q.x);
 float d=q.y-bend;
 float blur=.065+softness*.42;
 float t=0.;
 vec3 color;
 if(mode<.5){
   float sheet=smoothstep(-blur,blur+.25+spread*.20,d+.08);
   float folds=sin(d*(8.+detail*12.)+sin(q.x*1.35+motion*.17+s)*.75);
   float envelope=exp(-pow((d-.19)/(.36+spread*.20),2.));
   float hot=exp(-dot((p-vec2(-.28,.50))*vec2(1.35,1.55),(p-vec2(-.28,.50))*vec2(1.35,1.55))*3.8);
   t=.035+sheet*.77+hot*.24-folds*detail*.105*envelope;
   color=ramp(t);
 }else if(mode<1.5){
   vec2 w=q;
   w+=curve*.24*vec2(sin(q.y*3.+motion*.24+s),cos(q.x*2.4-motion*.18));
   vec3 sum=vec3(0.);float total=0.;
   for(int i=0;i<6;i++){
     float fi=float(i); float a=fi*2.39996+s;
     vec2 point=vec2(cos(a+motion*.055),sin(a-motion*.045))*(.32+spread*.42);
     point+=vec2(sin(fi*2.+motion*.16),cos(fi*3.-motion*.13))*.12;
     vec2 diff=w-point;
     float weight=exp(-dot(diff,diff)*(3.+(1.-softness)*10.+detail*2.));
     sum+=toLab(colors[i])*weight;total+=weight;
   }
   color=fromLab(sum/max(total,.00001));
 }else if(mode<2.5){
   float wave=d+.18*sin(q.x*2.4+motion*.27+s)+.075*sin(q.x*5.5-motion*.19);
   float curtain=exp(-pow(wave/(.09+spread*.22+softness*.14),2.));
   float folds=.94+.06*sin(q.x*(3.+detail*7.)+sin(q.y*2.)+motion*.3);
   t=.035+curtain*folds*.72+.06*exp(-dot(p,p)*1.8);
   color=ramp(t);
 }else if(mode<3.5){
   vec2 orb=q*vec2(1.,1.25+curve*.8);
   float radius=.22+spread*.34+sin(atan(orb.y,orb.x)*3.+s)*detail*.009;
   float dist=length(orb)-radius;
   float ring=exp(-pow(dist/(.025+softness*.16),2.));
   float illumination=.60+.35*sin(atan(orb.y,orb.x)+motion*.09+s);
   float outer=exp(-abs(dist)*3.)*.12;
   t=.035+ring*illumination+outer;
   color=ramp(t);
 }else if(mode<4.5){
   float horizon=q.y+.44+sin(q.x*(1.5+detail*2.)+motion*.18+s)*curve*.16;
   float light=exp(-pow((horizon-.90)/(.17+softness*.5+spread*.3),2.));
   t=.025+light*.97;
   color=ramp(t);
 }else if(mode<5.5){
   float ribbon=q.y+sin(q.x*(1.4+detail*2.)+motion*.12+s)*(.12+curve*.4);
   float fold=sin(ribbon*(4.+spread*8.)+sin(q.x*1.6-motion*.15)*curve*1.4);
   t=.5+fold*(.16+(1.-softness)*.23)+.09*sin(q.x*.8+q.y*1.5);
   color=ramp(t);
 }else if(mode<6.5){
   // Domain-warped flow: broad pools pulled into winding, liquid currents.
   vec2 w=q/(.45+spread*1.4);
   for(int i=0;i<3;i++){
     float fi=float(i);
     w+=vec2(sin(w.y*(2.1+detail*2.)+s+fi+motion*.24),
             cos(w.x*(2.3+detail*1.6)-s-fi-motion*.19))*(.12+curve*.35);
   }
   t=.5+.28*sin(w.x*2.+w.y*1.4+s+motion*.12)
       +.22*cos(w.y*2.6-w.x+s*.7-motion*.15);
   t=mix(smoothstep(.12,.88,t),t,softness);
   color=ramp(t);
 }else if(mode<7.5){
   float span=.2+spread*1.5;
   if(variant<.5)t=.5+q.y/span;
   else if(variant<1.5)t=length(q)/span;
   else t=fract(atan(q.y,q.x)/6.2831853+.5);
   // Conic uses a triangular ramp so its seam meets the same colour.
   if(variant>1.5)t=1.-abs(t*2.-1.);
   t=mix(smoothstep(.2,.8,t),t,softness);
   color=ramp(t);
 }else if(mode<8.5){
   float v=0.;
   float count=6.+floor(detail*12.);
   if(variant<.5){
     float wave=q.y+sin(q.x*(1.8+spread*3.)+s)*(.04+curve*.32);
     v=(wave/(.55+spread)+.5)*count;
   }else if(variant<1.5){
     vec2 arch=vec2(q.x*(1.+curve), min(q.y+.18,0.));
     v=length(arch)*count/(.45+spread);
   }else{
     float a=atan(q.y,q.x)/6.2831853+.5;
     v=a*(count+floor((1.-spread)*12.))+length(q)*curve*2.+s;
   }
   float feather=min(.45,.012+softness*.35+count/resolution.y);
   color=bands(v,feather);
 }else{
   float scale=3.+(1.-spread)*15.;
   vec2 tile=q*scale+vec2(s);
   if(variant>1.5)tile.y+=sin(tile.x*.5+s)*curve*.7;
   else tile.x+=sin(tile.y*.5+s)*curve*.7;
   vec2 cell=floor(tile),f=fract(tile);
   float feather=.004+softness*.16+scale/resolution.y;
   if(variant<.5){
     float a=smoothstep(0.,feather,f.x)-smoothstep(1.-feather,1.,f.x);
     float b=smoothstep(0.,feather,f.y)-smoothstep(1.-feather,1.,f.y);
     float check=mod(cell.x+cell.y,2.);
     color=mix(colors[5],ink(floor(cell.x*.5)+floor(cell.y*.5)),(1.-check)*a*b);
   }else if(variant<1.5){
     float radius=.08+detail*.36;
     float dotMask=1.-smoothstep(radius-feather,radius+feather,length(f-.5));
     color=mix(colors[5],ink(cell.x+cell.y*2.),dotMask);
   }else{
     color=bands(tile.y,feather);
   }
 }
 float noise=hash(gl_FragCoord.xy+vec2(seed,seed*2.13))-.5;
 color+=noise*(.0025+grain*.055);
 gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`;

export interface FieldRenderer {
	render(
		doc: GradientDocument,
		phase: number,
		width: number,
		height: number,
	): void;
	dispose(): void;
}
export function createFieldProgram(
	canvas: HTMLCanvasElement,
	vertexSource: string,
	fragmentSource: string,
): FieldRenderer {
	const gl = canvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		preserveDrawingBuffer: true,
		powerPreference: "low-power",
	});
	if (!gl)
		throw new Error(
			"This browser cannot render live gradients. Enable graphics acceleration and reload.",
		);
	const compile = (type: number, source: string) => {
		const shader = gl.createShader(type);
		if (!shader) throw new Error("Could not create the gradient shader.");
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const error = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error(error || "Gradient shader failed.");
		}
		return shader;
	};
	const vertex = compile(gl.VERTEX_SHADER, vertexSource),
		fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
	const program = gl.createProgram();
	if (!program) throw new Error("Could not initialize gradients.");
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		throw new Error(
			gl.getProgramInfoLog(program) || "Gradient program failed.",
		);
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
	gl.useProgram(program);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const pos = gl.getAttribLocation(program, "position");
	gl.enableVertexAttribArray(pos);
	gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
	const locations = new Map<string, WebGLUniformLocation | null>();
	const loc = (key: string) => {
		if (!locations.has(key))
			locations.set(key, gl.getUniformLocation(program, key));
		return locations.get(key) ?? null;
	};
	return {
		render(doc, phase, width, height) {
			const field = doc.field;
			if (!field) return;
			const w = Math.max(1, Math.round(width)),
				h = Math.max(1, Math.round(height));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			gl.viewport(0, 0, w, h);
			// biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
			gl.useProgram(program);
			gl.uniform2f(loc("resolution"), w, h);
			gl.uniform2f(loc("center"), field.x / 100, field.y / 100);
			gl.uniform1f(
				loc("mode"),
				[
					"beam",
					"mesh",
					"aurora",
					"halo",
					"edge",
					"silk",
					"flow",
					"still",
					"retro",
					"pattern",
				].indexOf(field.mode),
			);
			gl.uniform1f(
				loc("variant"),
				Math.max(
					0,
					[
						"linear",
						"radial",
						"conic",
						"waves",
						"arches",
						"sunburst",
						"checker",
						"dots",
						"stripes",
					].indexOf(field.variant ?? "") % 3,
				),
			);
			gl.uniform1f(loc("angle"), (field.angle * Math.PI) / 180);
			for (const key of ["softness", "spread", "curve", "detail"] as const)
				gl.uniform1f(loc(key), field[key] / 100);
			gl.uniform1f(loc("seed"), field.seed);
			gl.uniform1f(loc("phase"), phase);
			gl.uniform1f(loc("grain"), doc.grain / 100);
			gl.uniform3fv(
				loc("colors[0]"),
				new Float32Array(
					field.palette.flatMap((hex) =>
						[1, 3, 5].map(
							(i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255,
						),
					),
				),
			);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		},
		dispose() {
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vertex);
			gl.deleteShader(fragment);
		},
	};
}
export function createFieldRenderer(canvas: HTMLCanvasElement): FieldRenderer {
	return createFieldProgram(canvas, FIELD_VERTEX, FIELD_FRAGMENT);
}
let snapshotCanvas: HTMLCanvasElement | undefined;
let snapshotRenderer: FieldRenderer | undefined;
const previews = new Map<string, string>();
export function fieldDataUrl(
	doc: GradientDocument,
	width = 480,
	phase = doc.field?.phase ?? 0,
): string {
	const [x, y] = doc.aspectRatio.split(":").map(Number);
	const height = Math.round((width * y) / x);
	const key = JSON.stringify([
		doc.field,
		doc.grain,
		doc.aspectRatio,
		width,
		phase,
	]);
	if (width <= 480 && previews.has(key)) return previews.get(key) as string;
	if (!snapshotCanvas) {
		snapshotCanvas = document.createElement("canvas");
		snapshotRenderer = createFieldRenderer(snapshotCanvas);
	}
	if (!snapshotRenderer) throw new Error("Gradient renderer is unavailable.");
	snapshotRenderer.render(doc, phase, width, height);
	const data = snapshotCanvas.toDataURL("image/png");
	if (width <= 480) {
		if (previews.size >= 80)
			previews.delete(previews.keys().next().value as string);
		previews.set(key, data);
	}
	return data;
}
export function fieldDefaults(
	mode: GradientField["mode"] = "beam",
): GradientField {
	return {
		mode,
		palette: ["#070b17", "#101f40", "#244489", "#487dc9", "#9cc8ef", "#f1f8fb"],
		angle: 22,
		x: 50,
		y: 46,
		softness: 62,
		spread: 42,
		curve: 35,
		detail: 35,
		speed: 22,
		seed: 21,
		phase: 0,
	};
}

// Read-only visual previews use the same GPU program as the live artwork.
export function previewDataUrl(doc: GradientDocument, width = 240): string {
	if (doc.field) return fieldDataUrl(doc, width);
	return svgDataUrl(doc);
}

export async function fieldPngBlob(
	doc: GradientDocument,
	width: number,
): Promise<Blob> {
	if (!snapshotCanvas) {
		snapshotCanvas = document.createElement("canvas");
		snapshotRenderer = createFieldRenderer(snapshotCanvas);
	}
	if (!snapshotRenderer) throw new Error("Gradient renderer is unavailable.");
	const [x, y] = doc.aspectRatio.split(":").map(Number);
	snapshotRenderer.render(
		doc,
		doc.field?.phase ?? 0,
		width,
		Math.round((width * y) / x),
	);
	return new Promise((resolve, reject) =>
		snapshotCanvas?.toBlob(
			(blob) =>
				blob
					? resolve(blob)
					: reject(new Error("Could not create this PNG. Try a smaller size.")),
			"image/png",
		),
	);
}
