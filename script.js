document.addEventListener('DOMContentLoaded', () => {
    const audio = new Audio();
    const songTitle = document.querySelector('.song-title');
    const artist = document.querySelector('.artist');
    const albumArt = document.querySelector('.album-art');
    const songProgress = document.getElementById('song-progress');
    const currentTime = document.querySelector('.current-time');
    const totalTime = document.querySelector('.total-time');
    const playPauseButton = document.querySelector('.play-pause');
    const nextButton = document.querySelector('.next');
    const previousButton = document.querySelector('.previous');
    const shuffleButton = document.querySelector('.shuffle');
    const loopButton = document.querySelector('.loop');
    const addMusicInput = document.getElementById('add-music');
    const songsContainer = document.querySelector('.songs');
    const backgroundImage = document.querySelector('.background-image');

    let currentSongIndex = -1;
    let isDraggingProgressBar = false;
    let songs = [];
    let isShuffle = false;
    let isLoop = false;

    function loadSong(songIndex) {
        if (!songs[songIndex]) return;
        currentSongIndex = songIndex;
        const song = songs[songIndex];
        songTitle.textContent = song.title;
        artist.textContent = song.artist || 'Unknown Artist';

        // Set album art
        if (song.cover) {
            albumArt.style.backgroundImage = `url(${song.cover})`;
            backgroundImage.style.backgroundImage = `url(${song.cover})`;
        } else {
            albumArt.style.backgroundImage = ''; // Clear the background image if no cover
            backgroundImage.style.backgroundImage = '';
        }

        audio.src = song.url;
        audio.load();
        highlightCurrentSong();
        playSong();
    }

    function playSong() {
        if (currentSongIndex === -1) return;
        audio.play();
        playPauseButton.classList.remove('fa-play-circle');
        playPauseButton.classList.add('fa-pause-circle');
    }

    function pauseSong() {
        audio.pause();
        playPauseButton.classList.remove('fa-pause-circle');
        playPauseButton.classList.add('fa-play-circle');
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleButton.classList.toggle('active', isShuffle);
    }

    function toggleLoop() {
        isLoop = !isLoop;
        audio.loop = isLoop;
        loopButton.classList.toggle('active', isLoop);
    }

    function playNextSong() {
        if (currentSongIndex === -1) return;
        let nextSongIndex;
        if (isShuffle) {
            nextSongIndex = getRandomSongIndex();
        } else {
            nextSongIndex = (currentSongIndex + 1) % songs.length;
        }
        loadSong(nextSongIndex);
    }

    function playPreviousSong() {
        if (currentSongIndex === -1) return;
        let previousSongIndex;
        if (isShuffle) {
            previousSongIndex = getRandomSongIndex();
        } else {
            previousSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        }
        loadSong(previousSongIndex);
    }

    function getRandomSongIndex() {
        if (songs.length === 0) return -1;
        let newIndex = Math.floor(Math.random() * songs.length);
        while (newIndex === currentSongIndex && songs.length > 1) {
            newIndex = Math.floor(Math.random() * songs.length);
        }
        return newIndex;
    }

    function updateProgress() {
        if (!isDraggingProgressBar && audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            songProgress.style.width = `${progress}%`;
            currentTime.textContent = formatTime(audio.currentTime);
            totalTime.textContent = formatTime(audio.duration);
        }
    }

    function seek(event) {
        if (currentSongIndex === -1) return;
        const seekTime = (event.offsetX / songProgress.parentElement.offsetWidth) * audio.duration;
        audio.currentTime = seekTime;
        updateProgress();
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function handleMultipleSongs(files) {
        const newSongsPromises = Array.from(files).map(file => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    audioContext.decodeAudioData(e.target.result, (buffer) => {
                        const duration = formatTime(buffer.duration);

                        let artist = 'Unknown Artist';
                        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                        const artistMatch = fileNameWithoutExt.match(/^(.+?) - /);
                        if (artistMatch) {
                            artist = artistMatch[1];
                        }

                        // Get album art from file
                        const jsmediatags = window.jsmediatags;
                        new jsmediatags.Reader(file)
                            .read({
                                onSuccess: (tag) => {
                                    let cover = null;
                                    if (tag.tags.picture) {
                                        const data = tag.tags.picture.data;
                                        const format = tag.tags.picture.format;
                                        let base64String = "";
                                        for (let i = 0; i < data.length; i++) {
                                            base64String += String.fromCharCode(data[i]);
                                        }
                                        cover = `data:${format};base64,${window.btoa(base64String)}`;
                                    }

                                    resolve({
                                        title: file.name,
                                        artist: artist,
                                        url: URL.createObjectURL(file),
                                        duration: duration,
                                        file: file,
                                        cover: cover
                                    });
                                },
                                onError: (error) => {
                                    console.log('Error reading tags:', error);
                                    resolve({
                                        title: file.name,
                                        artist: artist,
                                        url: URL.createObjectURL(file),
                                        duration: duration,
                                        file: file,
                                        cover: null
                                    });
                                }
                            });
                    }, () => resolve(null));
                };
                reader.onerror = () => resolve(null);
                reader.readAsArrayBuffer(file);
            });
        });

        Promise.all(newSongsPromises).then(resolvedSongs => {
            const validSongs = resolvedSongs.filter(song => song !== null);
            songs = songs.concat(validSongs);
            renderSongs();
        });
    }

    function createSongItem(song, songIndex) {
        const songItem = document.createElement('li');
        songItem.innerHTML = `
            <span>${song.title}</span>
            <span>${song.duration}</span>
        `;
        songItem.addEventListener('click', () => {
            loadSong(songIndex);
        });
        return songItem;
    }

    function renderSongs() {
        songsContainer.innerHTML = '';
        songs.forEach((song, songIndex) => {
            const songItem = createSongItem(song, songIndex);
            songsContainer.appendChild(songItem);
        });
        highlightCurrentSong();
    }

    function highlightCurrentSong() {
        const songItems = songsContainer.querySelectorAll('li');
        songItems.forEach((item, index) => {
            item.classList.toggle('active', index === currentSongIndex);
        });
    }

    // Event Listeners
    playPauseButton.addEventListener('click', () => {
        if (audio.paused) {
            playSong();
        } else {
            pauseSong();
        }
    });

    nextButton.addEventListener('click', playNextSong);
    previousButton.addEventListener('click', playPreviousSong);
    shuffleButton.addEventListener('click', toggleShuffle);
    loopButton.addEventListener('click', toggleLoop);

    songProgress.parentElement.addEventListener('mousedown', (event) => {
        isDraggingProgressBar = true;
        seek(event);
    });

    songProgress.parentElement.addEventListener('mousemove', (event) => {
        if (isDraggingProgressBar) {
            seek(event);
        }
    });

    songProgress.parentElement.addEventListener('mouseup', () => {
        isDraggingProgressBar = false;
    });

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
        if (isLoop) {
            playSong(); 
        } else {
            playNextSong();
        }
    });

    addMusicInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            songs = [];
            currentSongIndex = -1;
            handleMultipleSongs(event.target.files);
        }
    });
	const colorPicker = document.getElementById('color-picker');
colorPicker.addEventListener('change', (event) => {
    const newColor = event.target.value;
    document.documentElement.style.setProperty('--accent-color', newColor);

    // Calculate hover color (e.g., make it slightly darker)
    const hoverColor = ColorLuminance(newColor, -0.2);
    document.documentElement.style.setProperty('--hover-color', hoverColor);
});

// Function to calculate lighter/darker color (you can adjust the luminance value)
function ColorLuminance(hex, lum) {
    // Validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // Convert to decimal and change luminosity
    let rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }

    return rgb;
}
});