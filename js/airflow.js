export function initAirflowSimulation() {
    const canvas = document.getElementById('airflow-canvas');
    if (!canvas) {
        console.log('Canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        const width = container.clientWidth;
        canvas.width = width;
        canvas.height = 400;
    }
    
    resizeCanvas();
    
    window.addEventListener('resize', resizeCanvas);
    
    const particles = [];
    const numParticles = 50;
    
    class AirParticle {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.reset();
        }
        
        reset() {
            this.x = -20;
            this.y = 20 + Math.random() * (this.height - 40);
            this.speed = 1.5 + Math.random() * 2.5;
            this.size = 2 + Math.random() * 2;
            this.opacity = 0.3 + Math.random() * 0.5;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.02 + Math.random() * 0.03;
        }
        
        update() {
            this.x += this.speed;
            this.wobble += this.wobbleSpeed;
            this.y += Math.sin(this.wobble) * 0.3;
            
            if (this.x > this.width + 50) {
                this.reset();
            }
            
            this.y = Math.max(10, Math.min(this.height - 10, this.y));
        }
        
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 200, 255, ${this.opacity})`;
            ctx.fill();
            
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
    
    let animationId = null;
    let isAnimating = true;
    
    function animate() {
        if (!isAnimating) return;
        if (!ctx || !canvas) return;
        
        const width = canvas.width;
        const height = canvas.height;
        
        if (width === 0 || height === 0) {
            animationId = requestAnimationFrame(animate);
            return;
        }
        
        if (particles.length === 0) {
            for (let i = 0; i < numParticles; i++) {
                const p = new AirParticle(width, height);
                p.x = Math.random() * width;
                particles.push(p);
            }
        }
        
        ctx.clearRect(0, 0, width, height);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0a0a2a');
        gradient.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        const shelterWidth = width * 0.35;
        const shelterHeight = height * 0.55;
        const shelterX = width * 0.5 - shelterWidth / 2;
        const shelterY = height * 0.25;
        
        for (let i = 0; i < 12; i++) {
            const y = shelterY + 20 + i * 28;
            if (y < shelterY + shelterHeight) {
                ctx.beginPath();
                ctx.moveTo(10, y);
                ctx.lineTo(shelterX - 15, y);
                ctx.strokeStyle = `rgba(100, 200, 255, 0.2)`;
                ctx.lineWidth = 1;
                ctx.setLineDash([8, 12]);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(shelterX + shelterWidth + 15, y);
                ctx.lineTo(width - 10, y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].width = width;
            particles[i].height = height;
            particles[i].update();
            particles[i].draw(ctx);
        }
        
        ctx.beginPath();
        ctx.rect(shelterX, shelterY + shelterHeight * 0.6, shelterWidth, shelterHeight * 0.4);
        ctx.moveTo(shelterX, shelterY + shelterHeight * 0.6);
        ctx.lineTo(shelterX + shelterWidth / 2, shelterY);
        ctx.lineTo(shelterX + shelterWidth, shelterY + shelterHeight * 0.6);
        ctx.fillStyle = 'rgba(80, 80, 120, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.rect(shelterX + shelterWidth * 0.4, shelterY + shelterHeight * 0.7, shelterWidth * 0.2, shelterHeight * 0.25);
        ctx.fillStyle = 'rgba(200, 150, 100, 0.6)';
        ctx.fill();
        ctx.stroke();
        
        ctx.font = '11px monospace';
        ctx.fillStyle = '#88aaff';
        ctx.fillText(`Inlet: 10 m/s`, 15, 30);
        ctx.fillStyle = '#aaa';
        ctx.fillText(`← Wind Direction`, 15, 50);
        
        ctx.fillStyle = '#88aaff';
        ctx.fillText(`Outlet: 101325 Pa`, width - 150, 30);
        
        ctx.fillStyle = '#ffaa66';
        ctx.fillText(`Turbulence: 5%`, 15, height - 15);
        ctx.fillText(`Wall Shear: 0.5 Pa`, width - 140, height - 15);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`💨 Wind Speed: 10 m/s`, width / 2 - 80, height - 15);
        
        ctx.beginPath();
        ctx.moveTo(width * 0.25, height * 0.12);
        ctx.lineTo(width * 0.25 + 35, height * 0.12);
        ctx.lineTo(width * 0.25 + 28, height * 0.12 - 6);
        ctx.moveTo(width * 0.25 + 35, height * 0.12);
        ctx.lineTo(width * 0.25 + 28, height * 0.12 + 6);
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => {
        isAnimating = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    };
}
