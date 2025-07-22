// Placeholder Brain Tetris module
// Displays a simple alert when launched

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('open-braintetris');
    if (btn) {
        btn.addEventListener('click', () => {
            alert('Brain Tetris coming soon!');
        });
    }
});
