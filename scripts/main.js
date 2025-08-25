'use strict'

var soundIn;
var audioElem = document.querySelector('audio')
var audioCtx = new (window.AudioContext || window.webkitAudioContext)()
var midiSynchronizer = new MidiSynchronizer('assets/bamb00.mid', audioElem).setTempo(156)

function togglePlay() {
	if(projectLoaded) {
		document.body.classList.add("hideInfo");
		audioCtx.resume()
		if (audioElem.paused) audioElem.play()
		else audioElem.pause()
	}
}

$(function() {

	function initAnalyser() {
		var audioNode = audioCtx.createMediaElementSource(audioElem)
		var analyser = audioCtx.createAnalyser()
		analyser.smoothingTimeConstant = 1
		analyser.fftSize = 512 //the total samples are half the fft size.
		audioNode.connect(analyser)
		analyser.connect(audioCtx.destination)
		var audioData = new Uint8Array(analyser.fftSize)

		function frame() {
			analyser.getByteTimeDomainData(audioData)
			soundIn = 0
			for (var i = 0; i < audioData.length; i++) soundIn += Math.abs(audioData[i] - 128)
			soundIn /= audioData.length
			requestAnimationFrame(frame)
		}
		frame()
	}

	function initEvents() {

		$("#audio button").on('mousedown', togglePlay)

		$("#info button").on('click', () => {
			$("body").addClass('hideInfo');
		});

		var i = null;
		$("body").on('mousemove',function() {
			clearTimeout(i);
			$("body").removeClass('noMove');
			i = setTimeout(function () {
				$("body").addClass('noMove');
			}, 2000);
		}).on('mouseleave',function() {
			clearTimeout(i);
			$("body").addClass('noMove');
		}).on('click',function() {
			if(window.innerWidth<1280) { randomSet(); randomSet(); }
		});

		$(audioElem)
			.on('playing', e => audioCtx.resume())
			.on('timeupdate', function () {
				$('#progress span').css('width', this.currentTime / this.duration * 100 + '%')
			})
			.on('ended', function () {
				$('body').removeClass('noMove')
			})
			.on('playing pause waiting', function () {
				$('body').toggleClass('playing', !this.paused)
			})

		midiSynchronizer.onEvent(e => {
			// check for type "note on" and if p5 loaded
			if (e.type === 9 && window.TWO_PI) noteOn(e.data[0])
		})

	}

	function init() {
		initAnalyser()
		initEvents()
	}

	init()

})
