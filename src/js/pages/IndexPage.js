import { GLOBAL_VARS } from 'utils/constants';
import { documentReady, pageLoad } from 'utils';
import Sketch from '../components/Sketch';

export default class IndexPage {
	constructor() {
		this.init = this.init.bind(this);
	}

	loadFunc() {
		console.log('index page load');

		const sketch = new Sketch({
			dom: document.querySelector('#container'),
		});
	}

	init() {
		this.loadFunc();
	}
}
