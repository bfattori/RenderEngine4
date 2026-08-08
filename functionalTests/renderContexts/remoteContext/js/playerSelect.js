window.addEventListener("DOMContentLoaded", () => {
    const playerSelection = document.querySelectorAll('div.player');
    playerSelection.forEach((player) => {
        player.addEventListener('click', (event) => {
            console.log(`Player ${event.target.id} selected`);
            disablePlayerSelection(event.target.id);
            event.preventDefault();

            // Add logic to handle the selection of a player
            window.location = `http://localhost:8080/remoteContext/contextReveiver.html?player=${event.target.id}`;
        });
    });
});

function disablePlayerSelection(targetId) {
    document.getElementById(targetId).classList.add('disabled');
    document.getElementById(targetId).removeEventListener('click');    
}