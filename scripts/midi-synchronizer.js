'use strict'

class MidiSynchronizer {
	constructor(midiFilePath, audioElem) {
		this.tempo = 120
		this.eventListeners = []
		this.setTime(0)

		audioElem.addEventListener('timeupdate', e => this.update())
		audioElem.addEventListener('ended', e => this.setTime(0))
		audioElem.addEventListener('seeked', e => this.setTime(this.currentTime))
		this.audioElem = audioElem

		fetch(midiFilePath)
			.then(res => res.arrayBuffer())
			.then(midiArrayBuffer => MidiParser.parse(new Uint8Array(midiArrayBuffer)))
			.then(midiData => {
				var currentTick = 0
				var getTime = tick => tick / midiData.timeDivision / this.tempo * 60
				this.eventsBySecond = []
				midiData.track[0].event.forEach(event => {
					currentTick += event.deltaTime
					var time = getTime(currentTick)
					if (!this.eventsBySecond[time | 0]) this.eventsBySecond[time | 0] = []
					this.eventsBySecond[time | 0].push({time, ...event})
				})
			})
			.then(() => this.update())
	}

	get currentTime() { return this.audioElem.currentTime }

	setTime(time) { this.lastTime = time - Number.EPSILON; return this }

	setTempo(tempo) { this.tempo = tempo; return this }

	onEvent(callback) { this.eventListeners.push(callback); return this }

	update() {
		var {currentTime, lastTime} = this
		if (!this.eventListeners.length) return this
		if (!this.eventsBySecond) return this
		if (this.audioElem.paused) return this
		if (currentTime === lastTime) return this
		if (currentTime < lastTime) return this.setTime(currentTime).update()

		var events = this.eventsBySecond.slice(lastTime | 0, currentTime + 1 | 0).flat()
			.filter(({time}) => lastTime < time && time <= currentTime)
		this.lastTime = currentTime
		this.eventListeners.forEach(cb => events.forEach(ev => cb(ev)))
		return this
	}
}
