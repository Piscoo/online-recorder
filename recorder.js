let gumStream;
let gdmStream;
let recorder;
let recordingData = [];
let recorderStream;
let cameraStream;
const isMac = /Mac/i.test(window.navigator.userAgent);
let useScreen = true;
let useMic = false;
let useAudio = false;
let useCamera = false;
let cameraIniting = false;
let recordedSeconds = 0;
let recordedCountTime = 0;
let videoName = null;
let recordStatus = 'setting';
let hasCamera;
let hasMicrophone;
let countTimer = null;
let isReadyCounting = false;
let fixedVideoBlob = null;
const previewVideo = document.getElementById('preview-video');
const cameraVideo = document.getElementById('camera-video');

(function checkDevices() {
	triggerMediaChecked();
	// check input devices
	navigator.mediaDevices.enumerateDevices().then(devices => {
		devices.forEach(device => {
			if (device.kind === "videoinput") hasCamera = true;
			if (device.kind === "audioinput") hasMicrophone = true;
		})
	})
})()

function triggerMediaChecked() {
	if (useScreen) {
		$("#trigger-screen").addClass('active');
	} else {
		$("#trigger-screen").removeClass('active');
	}
	if (useCamera) {
		$("#trigger-camera").addClass('active');
		$("#chooseCamera").addClass('active');
	} else {
		$("#trigger-camera").removeClass('active');
		$("#chooseCamera").removeClass('active');
	}
	if (useMic) {
		$("#trigger-microphone").addClass('active');
		$("#chooseMic").addClass('active');
	} else {
		$("#trigger-microphone").removeClass('active');
		$("#chooseMic").removeClass('active');
	}
	if (useAudio) {
		$("#trigger-sound").addClass('active');
		$("#chooseAudio").addClass('active');
	} else {
		$("#trigger-sound").removeClass('active');
		$("#chooseAudio").removeClass('active');
	}
}
$("#trigger-screen").off("click").on('click', () => {
	useScreen = !useScreen;
	triggerMediaChecked();
})
$("#trigger-camera").off("click").on('click', () => {
	if (hasCamera) {
		if (cameraIniting) return;
		useCamera = !useCamera;
		triggerMediaChecked();
		changeUseCamera();
	} else {
		$("#noCameraTip").css('display', 'flex');
	}
})
$("#trigger-sound").off("click").on('click', () => {
	useAudio = !useAudio;
	if (isMac && useAudio) {
		$("#getAppTip").css('display', 'flex');
		$("#getAppDefaultContent").css('display', 'none');
		$("#noDisplayMedia").css('display', 'none');
		$("#macAudioNotSupport").show();
	} else if (useAudio) {
		const showedAudioTip = localStorage.getItem('showedAudioTip');
		if (!showedAudioTip) {
			$("#chooseAudioTip").css('display', 'flex');
			localStorage.setItem('showedAudioTip', 'true');
		}
	}
	triggerMediaChecked();
})
$("#trigger-microphone").off("click").on('click', async () => {
	if (hasMicrophone) {
		useMic = !useMic;
		triggerMediaChecked();
	} else {
		$("#noMicTip").css('display', 'flex');
	}
})
$("#closeGetAppDialogIcon").off("click").on('click', () => {
	$("#getAppTip").css('display', 'none');
})

function changeUseCamera() {
	if (useCamera) {
		initPreviewCamera();
		if ('pictureInPictureEnabled' in document) {
			cameraVideo.style.opacity = 0;
			cameraVideo.style.zIndex = -10;
			cameraVideo.style.display = 'none';
		} else {
			cameraVideo.style.opacity = 1;
			cameraVideo.style.zIndex = 1000;
			cameraVideo.style.display = 'block';
		}
	} else {
		cancelPreviewCamera();
	}
}

// if choosed camera, init camera to enter picture-in-picture, if pic-in-pic is not support, show normal camera preview
async function initPreviewCamera() {
	cameraIniting = true;
	try {
		cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
		cameraVideo.srcObject = cameraStream;
		cameraVideo.addEventListener('canplaythrough', () => {
			cameraIniting = false;
			if ('pictureInPictureEnabled' in document) cameraVideo.requestPictureInPicture();
		})
		// when enter picture-in-picture mode
		cameraVideo.addEventListener('enterpictureinpicture', function (event) {
			cameraVideo.style.opacity = 0;
			cameraVideo.style.zIndex = -10;
		});
		// when exit picture-in-picture mode
		cameraVideo.addEventListener('leavepictureinpicture', function (event) {
			cancelPreviewCamera();
		});
	} catch (e) {
		// 授权失败弹窗
		showNotAllowedTip();
		cameraIniting = false;
		useCamera = false;
		$("#trigger-camera").removeClass('active');
	}
}
function cancelPreviewCamera() {
	useCamera = false;
	$("#trigger-camera").removeClass('active');
	if (document.pictureInPictureElement) document.exitPictureInPicture();
	cameraVideo.style.display = 'none';
	cameraVideo.style.opacity = 0;
	cameraVideo.style.zIndex = -10;
	let stream = cameraVideo.srcObject;
	if (stream) {
		let tracks = stream.getTracks();
		for (let i = 0; i < tracks.length; i++) {
			let track = tracks[i];
			track.stop();
		}
	}
	cameraVideo.srcObject = null;
}

$("#subStartBtn").off("click").on("click", () => {
	if (recordStatus == 'setting') {
		$("#onlineScreenBox").css('display', 'flex');
		$("#oldMainBox").hide();
		startRecord();
	}
})
// while click start btn
$("#start-record").off("click").on('click', startRecord)
async function startRecord() {
	if(!useMic && !useAudio && !useScreen) return;
	if (useMic) {
		initUserMedia();
	} else if(useAudio || useScreen) {
		initDisplayMedia({ video: true, audio: useAudio });
	}
}
async function initUserMedia() {
	try {
		gumStream = await navigator.mediaDevices.getUserMedia({ audio: useMic });
		if(useAudio || useScreen) {
			initDisplayMedia({ video: true, audio: useAudio });
		} else {
			readyCountDown(gumStream);
		}
	} catch (e) {
		showNotAllowedTip();
		useMic = false;
		$("#trigger-microphone").removeClass('active');
	}
}
async function initDisplayMedia(options) {
	try {
		gdmStream = await navigator.mediaDevices.getDisplayMedia(options);
		readyCountDown(gdmStream);
		gdmStream.getVideoTracks()[0].addEventListener('ended', () => {
			if (isReadyCounting) {
				$("#countdownBox").css('display', 'none');
				cancelPreviewCamera();
				clearInterval(countTimer);
				backToSetting();
				const countNum = document.getElementById('countdownNum');
				countNum.innerText = 3;
				isReadyCounting = false;
				recordedSeconds = 0;
			}
		})
	} catch (e) {
		if (e.name == 'NotFoundError' || e.message == 'The object can not be found here.' || e.name == 'TypeError') {
			$("#getAppTip").css('display', 'flex');
			$("#getAppDefaultContent").css('display', 'none');
			$("#noDisplayMedia").show();
			$("#macAudioNotSupport").css('display', 'none');
		} else {
			$(".light-top-tip").addClass('active');
			setTimeout(() => {
				$(".light-top-tip").removeClass('active');
			}, 2000)
		}
		console.log('授权失败！')
	}
}
// countdown 3 seconds before record
function readyCountDown(stream) {
	isReadyCounting = true;
	videoName = null;
	recordStatus = 'recording';
	recordingData = [];
	triggerMediaChecked();
	changeDisplayBlock();
	$("#countdownBox").css('display', 'flex');
	const countNum = document.getElementById('countdownNum');
	let start = 3;
	countTimer = setInterval(() => {
		if (start > 1) {
			start -= 1;
			countNum.innerText = start;
		} else if (start == 1) {
			start -= 1;
			$("#countdownBox").css('display', 'none');
		} else {
			clearInterval(countTimer);
			startMediaRecord(stream);
			countNum.innerText = 3;
			isReadyCounting = false;
		}
	}, 1000)
}
async function startMediaRecord(gdmStream) {
	recorderStream = gumStream ? mixStream(gumStream, gdmStream) : gdmStream;
	recorder = new MediaRecorder(recorderStream, { mimeType: 'video/webm' });

	recorder.start();
	recorder.ondataavailable = function (e) {
		if (e.data && e.data.size > 0) {
			recordingData.push(e.data);
		}
	};
	recorder.onstart = () => {
		$("#start-record").attr("disabled", true);
		$("#stop-record").removeAttr("disabled");
		$("#pause-record").removeAttr("disabled");
		startCountdown();
	};
	recorder.onstop = () => {
		if (document.pictureInPictureElement) document.exitPictureInPicture();
		stopCountdown();
		if (recordStatus == 'recording' || recordStatus == 'pause') {
			recordStatus = 'preview';
			$("#onlineScreenBox").addClass('preivew-main-box');
			videoName = getVideoFilename() + '.webm';
			// webRTC recorded media donn't have duration info, got a solution from github
			const blob = new Blob(recordingData, { type: 'video/webm' });
			ysFixWebmDuration(blob, recordedSeconds).then(fixedBlob => {
				fixedVideoBlob = fixedBlob;
				initPreviewVideo();
			})
		}
		$("#pause-record").removeClass("record-resume");
		$("#pause-record").addClass("record-pause");
		$(".pause-resume-word.resume").hide();
		$(".pause-resume-word.pause").show();
		$("#goBackDialog").css('display', 'none');
		recorder = null;
		cancelPreviewCamera();
		changeDisplayBlock();
	};
	recorder.onpause = () => {
		stopCountdown();
	}
	recorder.onresume = () => {
		startCountdown();
	}
	recorderStream.addEventListener('inactive', () => {
		// console.log('Capture stream inactive');
	});
	recorderStream.getVideoTracks()[0].addEventListener('ended', () => {
		stopMediaRecord();
	})
}

// mix recorded tracks into one media stream
function mixStream(gumStream, gdmStream) {
	let tracks = [];
	if (useMic && !useAudio) {
		if (gumStream.getAudioTracks().length > 0) tracks = tracks.concat(gumStream.getAudioTracks());
	} else if (useAudio && !useMic) {
		if (gdmStream.getAudioTracks().length > 0) tracks = tracks.concat(gdmStream.getAudioTracks());
	} else if (useAudio && useMic) {
		const ctx = new AudioContext();
		const dest = ctx.createMediaStreamDestination();
		if (gumStream.getAudioTracks().length > 0) ctx.createMediaStreamSource(gumStream).connect(dest);
		if (gdmStream.getAudioTracks().length > 0) ctx.createMediaStreamSource(gdmStream).connect(dest);
		tracks = tracks.concat(dest.stream.getTracks());
	}
	// if recorded screen, add videotracks
	if(useScreen) tracks = tracks.concat(gumStream.getVideoTracks()).concat(gdmStream.getVideoTracks());
	return new MediaStream(tracks)
}

function stopMediaRecord() {
	$("#start-record").removeAttr("disabled");
	$("#stop-record").attr("disabled", true);
	$("#pause-record").attr("disabled", true);
	if (recorderStream) recorderStream.getTracks().forEach(track => track.stop());
	if (gumStream) gumStream.getTracks().forEach(track => track.stop());
	if (gdmStream) gdmStream.getTracks().forEach(track => track.stop());
	if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
	$("#preview-video").attr('controls', true);
}

$("#stop-record").off("click").on('click', stopMediaRecord);
function initPreviewVideo() {
	let src = window.URL.createObjectURL(fixedVideoBlob);
	previewVideo.src = src;
}
function changeDisplayBlock() {
	switch (recordStatus) {
		case 'setting':
			$("#recordSetting").css('display', 'block');
			$('#recordCounting').css('display', 'none');
			$('#recordPreview').css('display', 'none');
			break;
		case 'recording':
			$("#recordSetting").css('display', 'none');
			$('#recordCounting').css('display', 'block');
			$('#recordPreview').css('display', 'none');
			break;
		case 'pause':
			$("#recordSetting").css('display', 'none');
			$('#recordCounting').css('display', 'block');
			$('#recordPreview').css('display', 'none');
			break;
		case 'preview':
			$("#recordSetting").css('display', 'none');
			$('#recordCounting').css('display', 'none');
			$('#recordPreview').css('display', 'block');
			break;
		default:
			$("#recordSetting").css('display', 'block');
			$('#recordCounting').css('display', 'none');
			$('#recordPreview').css('display', 'none');
			break;
	}
}

function formatMilliseconds(ms) {
	// 1- Convert to seconds:
	var seconds = ms / 1000;

	// 2- Extract hours:
	var hours = parseInt(seconds / 3600); // 3600 seconds in 1 hour
	seconds = parseInt(seconds % 3600); // extract the remaining seconds after extracting hours

	// 3- Extract minutes:
	var minutes = parseInt(seconds / 60); // 60 seconds in 1 minute

	// 4- Keep only seconds not extracted to minutes:
	seconds = Math.ceil(seconds % 60);

	// 5 - Format so it shows a leading zero if needed
	let hoursStr = ("00" + hours).slice(-2);
	let minutesStr = ("00" + minutes).slice(-2);
	let secondsStr = ("00" + seconds).slice(-2);

	return hoursStr + ":" + minutesStr + ":" + secondsStr
}
let recordingCountdown;
const spanRecordingDuration = document.getElementById('recordedTime');
function startCountdown() {
	const startedAt = (new Date()).getTime();
	let fnCountdown = function () {
		let current = (new Date()).getTime();
		recordedCountTime = (current - startedAt);
		let diff = formatMilliseconds(recordedSeconds + recordedCountTime);
		spanRecordingDuration.innerText = diff;
	};
	recordingCountdown = self.setInterval(fnCountdown, 1000);
	fnCountdown();
}
function stopCountdown() {
	// 暂停时记录已经录制的时间加上新录制的时长
	recordedSeconds += recordedCountTime;
	clearInterval(recordingCountdown);
}

$("#downloadRecordVideo").off("click").on('click', () => {
	const url = window.URL.createObjectURL(fixedVideoBlob);
	const a = document.createElement('a');
	a.style.display = 'none';
	a.href = url;
	a.download = videoName;
	document.body.appendChild(a);
	a.click();
	setTimeout(() => {
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}, 100);
});
function getVideoFilename() {
	let padTo2Digits = function (num) {
		return num.toString().padStart(2, '0');
	}

	let date = new Date();
	let time = [
		date.getFullYear(),
		padTo2Digits(date.getMonth() + 1),
		padTo2Digits(date.getDate()),
		padTo2Digits(date.getHours()),
		padTo2Digits(date.getMinutes()),
		padTo2Digits(date.getSeconds()),
	].join('-');
	return "recording-" + time
}


$("#goBackDialog").css('display', 'none');
$(".pause-resume-word.resume").hide();
$("#goBackTitle").off("click").on("click", () => {
	$("#goBackDialog").show();
	$("#goBackDialog").css('display', 'flex');
});

$("#recordNewTitle").off("click").on("click", backToSetting);

$("#cancelBack").off("click").on("click", () => {
	$("#goBackDialog").css('display', 'none');
})

$("#confirmBack").off("click").on("click", () => {
	$("#goBackDialog").css('display', 'none');
	$("#start-record").removeAttr("disabled");
	$("#stop-record").attr("disabled", true);
	$("#pause-record").attr("disabled", true);
	stopCountdown();
	backToSetting();
})
function backToSetting() {
	recordStatus = 'setting';
	$("#onlineScreenBox").removeClass('preivew-main-box');
	const spanRecordingDuration = document.getElementById('recordedTime');
	spanRecordingDuration.innerText = '00:00:00';
	previewVideo.src = null;
	recordedSeconds = 0;
	recordedCountTime = 0;
	triggerMediaChecked();
	changeDisplayBlock();
	stopMediaRecord();
}
$("#closeCameraTip").off("click").on("click", () => {
	$("#noCameraTip").css('display', 'none');
})
$("#closeMicTip").off("click").on("click", () => {
	$("#noMicTip").css('display', 'none');
})
$("#closeOnlineRecorder").off("click").on("click", () => {
	$("#onlineScreenBox").css('display', 'none');
	$("#oldMainBox").show();
	backToSetting();
	gumStream = null;
	gdmStream = null;
	recorder = null;
	cameraStream = null;
	recorderStream = null;
	recordingData = [];
})
function showNotAllowedTip() {
	$("#notAllowedTip").css("display", "flex");
}
$("#hideNotAllowedTip").off("click").on("click", () => {
	$("#notAllowedTip").css("display", "none");
})
$("#hideChooseAudioTip").off("click").on("click", () => {
	$("#chooseAudioTip").css("display", "none");
})

$("#pause-record").off("click").on("click", () => {
	if (recordStatus == "recording") {
		$("#pause-record").addClass("record-resume");
		$("#pause-record").removeClass("record-pause");
		$(".pause-resume-word.pause").hide();
		$(".pause-resume-word.resume").show();
		recordStatus = 'pause';
		recorder.pause();
	} else if (recordStatus == "pause") {
		$("#pause-record").removeClass("record-resume");
		$("#pause-record").addClass("record-pause");
		recordStatus = 'recording';
		recorder.resume();
		$(".pause-resume-word.resume").hide();
		$(".pause-resume-word.pause").show();
	}
})
