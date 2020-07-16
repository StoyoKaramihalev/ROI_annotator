<script>
  let files = []
  let regionFiles = []
  let selecting = ''
  let r = 8
  let currentTime = 0
  let roi = []
  let circles = []
  let regions = {
    reference: [],
    referenceValue: ''
  }
  let regionCount = 0
  let svg
  let downloadName = 'regions.json'
  let imgEl
  let circleMouseDown = false


  const defineClick = (cx, cy) => {
    if (circles.length > 1) {
      let fx = circles[0].x
      let fy = circles[0].y
      if (Math.abs(cx - fx) <= r && Math.abs(cy - fy) <= r){
        cx = fx
        cy = fy
        selecting = ''
      }
    }

    roi = [...roi, {x: cx, y: cy}]
    circles = [...circles, {x: cx, y: cy}]
  }
  const referClick = (x, y) => {
    if (regions.reference.length >= 2) return
    regions.reference = [...regions.reference, {x, y}]
  }
  const onClick = ({x, y}) => {
    if (selecting === '') return
    let cx = x - svgPos.left
    let cy = y - svgPos.top

    if (selecting === 'define') defineClick(cx, cy)
    if (selecting === 'refer') referClick(cx, cy)
  }
  const clear = () => {
    circles = []
    roi = []
  }
  const save = () => {
    regions[imgName + '_' + currentTime + (++regionCount)] = { name, points:  roi.slice() }
    roi = []
    circles = []
  }
  const pointify = r => r.map(({x, y}) => `${x},${y}`).join(' ')
  const setSvgWidth = () => {
    svg.style.width = imgEl.clientWidth
    svg.style.height = imgEl.clientHeight
  }
  const circleMouseMove = (e, index, key) => {
    const x = e.clientX - svg.getBoundingClientRect().x
    const y = e.clientY - svg.getBoundingClientRect().y
    regions[key].points[index] = {x, y}
    if (index === 0) regions[key].points[ regions[key].points.length - 1] = {x, y}
    else if (index ===  regions[key].points.length - 1) regions[key].points[0] = {x, y}
  }
  const loadRegion = (e) => {
    if (e.target.files.length === 0) return
    const regionFile = e.target.files[0]
    const reader = new FileReader();

    reader.onload = evt => {
      regions = Object.assign(regions, JSON.parse(evt.target.result))
    }

    reader.readAsText(regionFile)
  }

  $: svgPos = svg && {left: svg.getBoundingClientRect().x, top: svg.getBoundingClientRect().y}
  $: points = pointify(roi)
  $: img = files.length > 0 ? files[0] : null
  $: imgUrl =  img ? URL.createObjectURL(img) : ''
  $: imgName = img ? img.name : 'unknown'
  $: name = 'region_' + regionCount
  $: downloadName = imgName + '.json'
</script>

<header>
  <h1>Annotate regions of interest (ROIs)</h1>
</header>
<hr style="solid">
<main>
<div class="row" style="line-height:50%">
  <div class="column">
	  <p>Select image:</p> 
    <p style="font-size:0.8em;font-style:italic;">Choose a representative frame you wish to annotate.</p>
    <p><input type="file" accept="image/*" bind:files></p>
  </div>
  <div class="column">
	  <p>Select regions (optional): </p>
    <p style="font-size:0.8em;font-style:italic;">If an ROI file already exists, you may load it here.</p>
    <p><input type="file" accept="application/JSON" on:change={loadRegion}></p>
  </div>
  <p>Add reference line:</p>
  <p style="font-size:0.8em;font-style:italic;">Draw line between two reference points and input </p>
  <p>
  <button class:pointer={selecting === 'refer'} on:click={() => selecting = 'refer'}>Draw reference</button>
     <input bind:value={regions.referenceValue} placeholder="Reference value"/>
  </p>
<hr style="solid">
<div class="row" style = "text-align:center;">
  <button class:pointer={selecting === 'define'} on:click={() => selecting = 'define'}>Define ROI</button>
  <button on:click={clear}>Clear ROI</button>
  <button disabled={roi.length < 4} on:click={save}>Save ROI</button>
  <input bind:value={name} required minlength="1"/>

  <div class="container not-selectable">
    <svg bind:this={svg} on:click={onClick} class:pointer={selecting !== ''}>
      {#each Object.entries(regions).filter(([k, v]) => v.points) as [key, {name: rname, points}]}
        <text x={points[0].x} y={points[0].y - 5} fill="white" class="not-selectable">{rname}</text>
        <polyline points={pointify(points)} fill="none" stroke="darkgreen" stroke-width="2"/>
        {#each points as point, index}
          <circle cx={point.x} cy={point.y} {r} fill="darkgreen" class="point"
            on:mousemove={e => circleMouseDown && circleMouseMove(e, index, key)}
            on:mousedown={() => circleMouseDown = true}
            on:mouseup={() => circleMouseDown = false}
            on:mouseleave={() => circleMouseDown = false}
            />
        {/each}
      {/each}
      <polyline {points} fill="none" stroke="lightblue" stroke-width="1" stroke-dasharray="5,5"/>
      {#each circles as {x, y}}
        <circle cx={x} cy={y} {r} fill="lightblue"/>
      {/each}
      {#if regions.reference.length > 0}
        <polyline points={pointify(regions.reference)} fill="none" stroke="darkred" stroke-width="2"/>
      {/if}
    </svg>
    <img on:load={setSvgWidth} bind:this={imgEl} src={imgUrl} alt=" Image for annotation goes here"/>
  </div>

  </div>

  {#if Object.keys(regions).length > 0}
  <div class="row" style="text-align:center">
  <p>
    <a download={downloadName} href={`data:application/json,${JSON.stringify(regions, null, 4)}`}>Save</a>
    <input bind:value={downloadName}/>
  </p>
  </div>
  {/if}

</main>

<footer>
  <p>Developed by: <a href="https://github.com/mkaramihalev">Marin Karamihalev</a></p>
  <p>GitHub <a href="https://github.com/StoyoKaramihalev/ROI_annotator">Repository</a></p>
</footer>

<style>

  header {
    text-align: center;
    padding: 0.2em;
  }

  footer {
    text-align: center;
    padding: 2em;
    font-size: 0.8em;
  }

  h1 {
    font-size: 1.5em;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 100;
  }

  h2 {
    font-size: 1.1em;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 100;
  }
	
  main {
		text-align: left;
		padding: 0.2em;
    margin: 0 auto;
    background: rgb(255, 255, 255);
    width: 100%;
    height: 80%;
    font-weight: 100;
	}
  
  img {
    border-color: black;
    border-width: 1px;
    border-style: dashed;
    border-radius: 0;
  }
  .column {
    float: left;
    width: 50%;
  }
  .not-selectable {
    user-select: none;
  }

  .pointer {
    cursor: pointer;
  }

  .container {
    position: relative;
  }

  svg {
    z-index: 2;
    position: absolute;
  }

	img {
    z-index: 1;
    height: 40vh;
  }
  .point:hover {
    cursor: pointer;
  }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
