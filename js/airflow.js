export function initAirflowSimulation() {
    const canvas = document.getElementById('airflow-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    // Particle system for airflow visualization
    const particles = [];
    const numParticles = 60;
    
    // Wind speed: 10 m/s (normal wind speed)
    const windSpeed = 10; // m/s
    const windDirection = 1; // 1 = left to right, -1 = right to left
    
    // Boundary conditions
    const boundaryConditions = {
        inletVelocity: 10, // m/s
        outletPressure: 101325, // Pa (atmospheric)
        turbulenceIntensity: 0.05, // 5%
        wallShearStress: 0.5 // Pa
    };
    
    class AirParticle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = -20; // Start off-screen left
            this.y = Math.random() * height;
            this.speed = 2 + Math.random() * 3; // Random speed
            this.size = 2 + Math.random() * 3;
            this.opacity = 0.3 + Math.random() * 0.5;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.02 + Math.random() * 0.03;
        }
        
        update() {
            this.x += this.speed;
            this.wobble += this.wobbleSpeed;
            // Add slight vertical oscillation to simulate turbulence
            this.y += Math.sin(this.wobble) * 0.5;
            
            if (this.x > width + 50) {
                this.reset();
            }
            
            // Keep within bounds
            this.y = Math.max(10, Math.min(height - 10, this.y));
        }
        
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 200, 255, ${this.opacity})`;
            ctx.fill();
            
            // Add trailing line (dotted effect)
            ctx.beginPath();
            ctx.moveTo(this.x - this.size * 2, this.y);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `rgba(100, 200, 255, ${this.opacity * 0.5})`;
            ctx.lineWidth = this.size * 0.8;
            ctx.setLineDash([5, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
        const p = new AirParticle();
        p.x = Math.random() * width;
        p.y = Math.random() * height;
        particles.push(p);
    }
    
    // Draw shelter outline
    function drawShelter() {
        const shelterWidth = width * 0.4;
        const shelterHeight = height * 0.6;
        const shelterX = width * 0.5 - shelterWidth / 2;
        const shelterY = height * 0.2;
        
        // Draw shelter silhouette
        ctx.beginPath();
        // Base rectangle
        ctx.rect(shelterX, shelterY + shelterHeight * 0.6, shelterWidth, shelterHeight * 0.4);
        // Roof (triangle)
        ctx.moveTo(shelterX, shelterY + shelterHeight * 0.6);
        ctx.lineTo(shelterX + shelterWidth / 2, shelterY);
        ctx.lineTo(shelterX + shelterWidth, shelterY + shelterHeight * 0.6);
        ctx.fillStyle = 'rgba(50, 50, 80, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Door indication
        ctx.beginPath();
        ctx.rect(shelterX + shelterWidth * 0.4, shelterY + shelterHeight * 0.7, shelterWidth * 0.2, shelterHeight * 0.3);
        ctx.fillStyle = 'rgba(200, 150, 100, 0.5)';
        ctx.fill();
        ctx.stroke();
        
        return { shelterX, shelterY, shelterWidth, shelterHeight };
    }
    
    // Draw flow lines
    function drawFlowLines() {
        const shelter = drawShelter();
        ctx.setLineDash([10, 15]);
        ctx.lineWidth = 1.5;
        
        for (let i = 0; i < 12; i++) {
            const y = shelter.shelterY + 20 + i * 30;
            if (y < shelter.shelterY + shelter.shelterHeight) {
                ctx.beginPath();
                ctx.moveTo(10, y);
                ctx.lineTo(shelter.shelterX - 20, y);
                ctx.strokeStyle = `rgba(100, 200, 255, ${0.2 + i * 0.03})`;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(shelter.shelterX + shelter.shelterWidth + 20, y);
                ctx.lineTo(width - 20, y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
    }
    
    // Draw boundary conditions text
    function drawBoundaryConditions() {
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ffaa66';
        ctx.shadowBlur = 0;
        
        // Inlet (left side)
        ctx.fillStyle = '#88aaff';
        ctx.fillText(`Inlet Velocity: ${boundaryConditions.inletVelocity} m/s`, 15, 30);
        ctx.fillStyle = '#aaa';
        ctx.fillText(`← Wind Direction`, 15, 50);
        
        // Outlet (right side)
        ctx.fillStyle = '#88aaff';
        ctx.fillText(`Outlet Pressure: ${boundaryConditions.outletPressure} Pa`, width - 180, 30);
        
        // Top and Bottom
        ctx.fillStyle = '#ffaa66';
        ctx.fillText(`Wall Shear Stress: ${boundaryConditions.wallShearStress} Pa`, width - 200, height - 20);
        ctx.fillText(`Turbulence Intensity: ${boundaryConditions.turbulenceIntensity * 100}%`, 15, height - 20);
        
        // Wind speed indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`💨 Wind Speed: ${windSpeed} m/s (Normal)`, width / 2 - 100, height - 45);
    }
    
    let animationId = null;
    
    function animate() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0a0a2a');
        gradient.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw flow lines (stationary)
        drawFlowLines();
        
        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw(ctx);
        }
        
        // Draw shelter on top
        drawShelter();
        
        // Draw boundary conditions text
        drawBoundaryConditions();
        
        // Draw wind direction arrow
        ctx.beginPath();
        ctx.moveTo(width * 0.3, height * 0.1);
        ctx.lineTo(width * 0.3 + 40, height * 0.1);
        ctx.lineTo(width * 0.3 + 30, height * 0.1 - 8);
        ctx.moveTo(width * 0.3 + 40, height * 0.1);
        ctx.lineTo(width * 0.3 + 30, height * 0.1 + 8);
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#88aaff';
        ctx.fillText('Wind Flow', width * 0.3 - 30, height * 0.1 - 5);
        
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
        const newWidth = canvas.clientWidth;
        const newHeight = canvas.clientHeight;
        canvas.width = newWidth;
        canvas.height = newHeight;
    });
    
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
    };
}
