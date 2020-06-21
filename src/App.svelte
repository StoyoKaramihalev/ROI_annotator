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
  let width = 600
  let height = 400
  let svg


  const onClick = ({x, y}) => {
    if (!selecting) return
    let cx = x - svgPos.left
    let cy = y - svgPos.top
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
    regions[videoName + '_' + currentTime + (++regionCount)] = roi.slice()
    roi = []
    circles = []
  }


  $: svgPos = svg && {left: svg.getBoundingClientRect().x, top: svg.getBoundingClientRect().y}
  $: points = roi.map(({x, y}) => `${x},${y}`).join(' ')
  $: video = files.length > 0 ? files[0] : null
  $: videoUrl =  video ? URL.createObjectURL(video) : ''
  $: videoName = video ? video.name : 'unknown'
</script>

<header>
  <h1>ROI annotator</h1>
</header>

<main class:pointer={selecting}>
	<p>Select video: <input type="file" accept="video/*" bind:files></p>
  <input type="range" min="0" max={duration} step="0.1" bind:value={currentTime} />
  <button on:click={() => selecting = true}>Define ROI</button>
  <button on:click={clear}>Clear ROI</button>
  <button disabled={roi.length < 4} on:click={save}>Save ROI</button>
  <div class="container" on:click={onClick}>
    <svg bind:this={svg}>
      {#each Object.values(regions) as r}
        <polyline points={r.map(({x, y}) => `${x},${y}`).join(' ')} fill="none" stroke="red" stroke-width="2"/>
      {/each}
      <polyline {points} fill="none" stroke="white" stroke-width="2" stroke-dasharray="10,10"/>
      {#each circles as {x, y}}
        <circle cx={x} cy={y} {r} fill="white"/>
      {/each}
    </svg>
    <video src={videoUrl} bind:currentTime bind:duration />
  </div>
  <ul>
  {#each Object.keys(regions) as region}
    <li>{region}</li>
  {/each}
  </ul>
  {#if Object.keys(regions).length > 0}
  <a download="regions.json"
    href={`data:application/json,${JSON.stringify(regions, null, 2)}`}>Download regions</a>
  {/if}
</main>

<footer>
  <p>Developed by: <a href="https://github.com/mkaramihalev">Marin Karamihalev</a></p>
  <p><a href="https://github.com/mkaramihalev/stoyo-roi">Repository</a> on GitHub</p>
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
    width: 100%;
    height: 75%;
	}

  .pointer {
    cursor: pointer;
  }

  .container {
    width: 90vw;
    height: 60vh;
    position: relative;
  }

  svg {
    z-index: 2;
    position: absolute;
    height: 100%;
    width: 100%;
  }

	video {
    z-index: 1;
    height: 100%;
    width: 100%;
  }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
