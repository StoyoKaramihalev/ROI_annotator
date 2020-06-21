<script>
  let files = []
  let selecting = false
  let duration = 5
  let r = 5
  let currentTime = 0
  let roi = []
  let circles = []
  let regions = {}
  let regionCount = 0
  let svg
  let downloadName = 'regions.json'
  let videoEl


  const onClick = ({x, y}) => {
    if (!selecting) return //do nothing if not selecting
    let cx = x - svgPos.left
    let cy = y - svgPos.top

    console.log({cx, cy})
    if (circles.length > 1) {
      let fx = circles[0].x
      let fy = circles[0].y
      if (Math.abs(cx - fx) <= r && Math.abs(cy - fy) <= r){
        cx = fx
        cy = fy
        selecting = false
      }
    }

    roi = [...roi, {x: cx, y: cy}]
    circles = [...circles, {x: cx, y: cy}]
  }
  const clear = () => {
    circles = []
    roi = []
  }
  const save = () => {
    regions[videoName + '_' + currentTime + (++regionCount)] = { name, points:  roi.slice() }
    roi = []
    circles = []
  }
  const pointify = r => r.map(({x, y}) => `${x},${y}`).join(' ')
  const setSvgWidth = () => {
    svg.style.width = videoEl.clientWidth
    svg.style.height = videoEl.clientHeight
  }


  $: svgPos = svg && {left: svg.getBoundingClientRect().x, top: svg.getBoundingClientRect().y}
  $: points = pointify(roi)
  $: video = files.length > 0 ? files[0] : null
  $: videoUrl =  video ? URL.createObjectURL(video) : ''
  $: videoName = video ? video.name : 'unknown'
  $: name = 'region_' + regionCount
</script>

<header>
  <h1>ROI annotator</h1>
</header>

<main>
	<p>Select video: <input type="file" accept="video/*" bind:files></p>
  <input type="range" min="0" max={duration} step="0.1" bind:value={currentTime} />
  <button class:pointer={selecting} on:click={() => selecting = true}>Define ROI</button>
  <button on:click={clear}>Clear ROI</button>
  <button disabled={roi.length < 4} on:click={save}>Save ROI</button>
  <input bind:value={name} required minlength="1"/>

  <div class="container">
    <svg bind:this={svg} on:click={onClick} class:pointer={selecting}>
      {#each Object.values(regions) as {name: rname, points}}
        <text x={points[0].x} y={points[0].y - 5} fill="white">{rname}</text>
        <polyline points={pointify(points)} fill="none" stroke="darkgreen" stroke-width="2"/>
      {/each}
      <polyline {points} fill="none" stroke="lightblue" stroke-width="2" stroke-dasharray="10,10"/>
      {#each circles as {x, y}}
        <circle cx={x} cy={y} {r} fill="lightblue"/>
      {/each}
    </svg>
    <video on:loadeddata={setSvgWidth} bind:this={videoEl} src={videoUrl} bind:currentTime bind:duration />
  </div>

  {#if Object.keys(regions).length > 0}
  <p>
    <a download={downloadName} href={`data:application/json,${JSON.stringify(regions, null, 4)}`}>Download regions</a>
    <input bind:value={downloadName}/>
  </p>
  {/if}

</main>

<footer>
  <p>Developed by: <a href="https://github.com/mkaramihalev">Marin Karamihalev</a></p>
  <p><a href="https://github.com/StoyoKaramihalev/ROI_annotator">Repository</a> on GitHub</p>
</footer>

<style>

  header {
    text-align: center;
    background: rgb(240, 240, 240);
    padding: 1em;
  }

	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
    margin: 0 auto;
    background: rgb(255, 255, 255);
    width: 90%;
    height: 70%;
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

	video {
    z-index: 1;
    height: 40vh;
  }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
