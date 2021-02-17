const VERSION_JAVA   = '1.17'
const BRANCH_JAVA    = 'Jappa-1.17'
const BRANCH_BEDROCK = 'Jappa-1.16.200'
window.ERROR_IMG     = './image/gallery/not-found.png'

const TYPE_JAVA      = 'java'
const TYPE_BEDROCK   = 'bedrock'
const TYPE_DUNGEONS  = 'dungeons'
const TYPE_EDUACTION = 'education'

const ARTIST_UNKNOWN = 'Unknown'

window.data = {
	versions:          ['java-32x', 'java-64x', 'bedrock-32x', 'bedrock-64x', 'dungeons', 'education'],
	javaSections:      ['all', 'block', 'effect', 'entity', 'environment', 'font', 'gui', 'item', 'map', 'misc', 'mob_effect', 'models', 'painting', 'particle'],
	bedrockSections:   ['all', 'blocks', 'effect', 'entity', 'environment', 'gui', 'items', 'map', 'misc', 'models', 'painting', 'particle', 'ui'],
	dungeonsSections:  ['all', 'blocks', 'components', 'decor', 'effects', 'entity', 'equipment', 'items', 'materials', 'others', 'ui'],
	educationSections: ['all']
}

window.cache = {}

window.capitalize = string => {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

window.getJson = async url => {
	if (window.cache.hasOwnProperty(url)) {
		console.log('cached: ' + url)
		return window.cache[url]
	} else {
		console.log('new: ' + url)
		let data = await fetch(url).then(response => response.json())
		window.cache[url] = data
		return data
	}
}

window.getJSON = function(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'json';

	xhr.onload = function () {
		var status = xhr.status;
		if (status == 200) callback(null, xhr.response);
		else callback(status);
	};

	xhr.send();
};

export default {
	name: 'gallery-page',
	data() {
		return {
			currentSections: [],
			imageArray: [],
			currentType: '',
			currentTypeObject: '',
			currentRepository: '',
			currentBranch: '',
			searchString: '',

			renderer: null,
			scene: null,
			camera: null,
			ambientLight: null,
			directionalLight: null
		}
	},
	watch:{
		$route() {
			this.update()
		}
	},
	template:
	`<div>
		<div ref="modal" class="modal" v-on:click="closeModal()">
			<span class="close">×</span>
			<div class="modal-content">
				<div class="res-grid-2">
					<img class="center" width="256" height="256" ref="modal_img" onerror="this.src = ERROR_IMG">
					<div class="center" ref="modal_render" id="wrapper"></div>
				</div>
				<h1 ref="modal_h1"></h1>
				<p ref="modal_p"></p>
			</div>
		</div>
		<div class="mb-4">
			<router-link v-for="item in window.data.versions" :key="item" class="btn btn-dark mr-1 mb-2" :to="'/' + item + '/' + $route.params.section">{{ window.capitalize(item) }}</router-link>
		</div>
		<input id="SearchBar" type="text" placeholder="Search for a texture name or path..." title="Type something" class="fancy-card-1x mb-4" v-model="searchString" v-on:keyup.enter="showResults()">
		<div class="mb-4">
			<router-link v-for="item in currentSections" :key="item" class="btn btn-dark mr-1 mb-2" :to="'/' + $route.params.version + '/' + item">{{ window.capitalize(item) }}</router-link>
		</div>
		<div class="res-grid-6">
			<div v-for="item in imageArray" :key="item.path" class="gallery-item">
				<img :src="item.path" loading="lazy" :alt="item.title" onerror="this.src = ERROR_IMG">
				<a :href="item.path" download class="fas fa-download"></a>
				<i class="fas fa-expand" v-on:click="fullscreen(item); render(item.render)"></i>
				<div class="info">
					<p>{{ item.title }}</p>
					<p class="secondary">{{ item.artist }}</p>
				</div>
			</div>
		</div>
	</div>`,
	methods: {
		loadType() {
			let tempVersion = this.$route.params.version.toLowerCase()
			if (tempVersion.includes(TYPE_JAVA)) {
				this.currentType = TYPE_JAVA
				this.currentSections = window.data.javaSections
				if (tempVersion.includes('64')) {
					this.currentTypeObject = 'c64'
					this.currentRepository = 'Compliance-Java-64x'
				}
				else {
					this.currentTypeObject = 'c32'
					this.currentRepository = 'Compliance-Java-32x'
				}
				this.currentBranch = BRANCH_JAVA
			} else if (tempVersion.includes(TYPE_BEDROCK)) {
				this.currentType = TYPE_BEDROCK
				this.currentSections = window.data.bedrockSections
				if (tempVersion.includes('64')) {
					this.currentTypeObject = 'c64'
					this.currentRepository = 'Compliance-Bedrock-64x'
				}
				else {
					this.currentTypeObject = 'c32'
					this.currentRepository = 'Compliance-Bedrock-32x'
				}
				this.currentBranch = BRANCH_BEDROCK
			} else if (tempVersion.includes(TYPE_DUNGEONS)) {
				this.currentType = TYPE_DUNGEONS
				this.currentSections = window.data.dungeonsSections
				this.currentRepository = null
				this.currentBranch = null
			} else if (tempVersion.includes(TYPE_EDUACTION)) {
				this.currentType = TYPE_EDUACTION
				this.currentSections = window.data.educationSections
				this.currentRepository = 'Education-Edition'
				this.currentBranch = null
			}
		},
		async getArtists(object) {
			let readableArtists = []
			if (object[this.currentTypeObject].hasOwnProperty('author')) {
				let profiles = await window.getJson('https://raw.githubusercontent.com/Compliance-Resource-Pack/JSON/main/profiles.json')
				object[this.currentTypeObject].author.forEach(item => {
					for (const profile of profiles) {
						if (item === profile.id) {
							if (profile.username !== null) readableArtists.push(profile.username)
							break
						}
					}
				})
			}
			return readableArtists.length < 1 ? ARTIST_UNKNOWN : readableArtists.join(', ')
		},
		async filter(string) {
			if (string.toLowerCase().includes('all')) string = ''
			let textures = await window.getJson('https://raw.githubusercontent.com/Compliance-Resource-Pack/JSON/main/contributors/' + this.currentType + '.json')
			let tempArray = []
			let currentItem = null
			for (const item of textures) {
				if (this.currentType == TYPE_JAVA) currentItem = '/assets/' + item.version[VERSION_JAVA]
				else if (this.currentType == TYPE_BEDROCK) currentItem = '/' + item.path
				let artists = await this.getArtists(item)
				if (
					(currentItem.toLowerCase().includes(this.searchString.toLowerCase()) || artists.toLowerCase().includes(this.searchString.toLowerCase()))
					&& currentItem.toLowerCase().includes(string.toLowerCase())
				) {
					tempArray.push({
						title: currentItem.substring(currentItem.lastIndexOf('/') + 1, currentItem.lastIndexOf('.')).replace(/(.{3})/g,"$1\xAD"),
						path: 'https://raw.githubusercontent.com/Compliance-Resource-Pack/' + this.currentRepository + '/' + this.currentBranch + currentItem,
						artist: artists,
						render: item.render || {}
					})
				}
			}
			return tempArray
		},
		async update() {
			this.loadType()

			if (this.currentType == TYPE_DUNGEONS || this.currentType == TYPE_EDUACTION) {
				this.imageArray = [{
					title: 'Missing Config File!',
					path: window.ERROR_IMG,
					artist: 'Please contact us!'
				}]
				return
			}

			this.imageArray = await this.filter('/' + this.$route.params.section + '/')
		},
		showResults() {
			if (this.$route.params.section != 'all') this.$router.push('/' + this.$route.params.version + '/all')
		},
		async fullscreen(item) {
			this.$refs.modal_img.src       = item.path
			this.$refs.modal_h1.innerHTML  = item.title
			this.$refs.modal_p.innerHTML   = item.artist
			this.$refs.modal.style.display = 'block'
		},
		closeModal() {
			let container = document.getElementById('wrapper');
			container.innerHTML = '';
			this.$refs.modal.style.display = 'none';
		},
		async render(render) {
			var container = document.getElementById('wrapper');
			var viewer    = new ModelViewer(container);

			window.addEventListener('resize', viewer.resize);

			console.log(viewer);
			console.log(JSON.stringify(render));

			var json, textures
			var model = new JsonModel('demo', jsonDEMO, texturesDEMO);
			
			if (render.type != undefined) {
				let path = 'https://raw.githubusercontent.com/Compliance-Resource-Pack/' + this.currentRepository + '/' + this.currentBranch + '/';
				if (this.currentRepository.includes('Java')) path += 'assets/';

				for (var i = 0; i < render.textures.length; i++) {
					render.textures[i].texture = path + render.textures[i].texture;
				}

				json  = await getJson('https://raw.githubusercontent.com/Compliance-Resource-Pack/JSON/main/render/'+ render.type +'.json');
				model = new JsonModel(render.name, JSON.stringify(json), render.textures);
			}
			
      viewer.load(model);
      viewer.resize();
		}
	},
	mounted() {
		this.update()
	}
}
