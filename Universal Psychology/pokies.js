// pokies.js
export function initPokies(gameAPI) {
    const { getGameState, updateDisplays, logMessage } = gameAPI;
    const symbols = ['Neuron', 'Brain', 'Freud', 'Pavlov', 'Notepad'];
    const payouts = {
        'Neuron': 20,
        'Brain': 15,
        'Freud': 12,
        'Pavlov': 10,
        'Notepad': 5
    };
    const spinBtn = document.getElementById('pokies-spin');
    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    if(!spinBtn || reels.some(r => !r)) return;
    spinBtn.addEventListener('click', () => {
        const state = getGameState();
        if(state.psychbucks < 1) {
            logMessage('Not enough Psychbucks to spin.', 'log-warning');
            return;
        }
        state.psychbucks -= 1;
        const results = [];
        for(let i=0;i<3;i++) {
            const sym = symbols[Math.floor(Math.random()*symbols.length)];
            results.push(sym);
            reels[i].textContent = sym;
        }
        let win = 0;
        if(results[0] === results[1] && results[1] === results[2]) {
            win = payouts[results[0]] || 0;
            logMessage(`Jackpot! ${results[0]} x3 +${win} PB`, 'log-unlock');
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            win = 2;
            logMessage(`Small win! +${win} PB`, 'log-info');
        } else {
            logMessage('No win this time.', 'log-warning');
        }
        state.psychbucks += win;
        updateDisplays();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if(window.GameAPI) {
        initPokies(window.GameAPI);
    }
});
