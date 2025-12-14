// Mark this file as a client component. Without this directive Next.js
// will attempt to render it on the server, which will fail because it
// accesses browser APIs like `window` and uses WebGL. See:
// https://nextjs.org/docs/getting-started/react-essentials#the-use-client-directive
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { 
    GameConfig, Player, TrashItem, Virus, EjectedMass, 
    Vector, Portal, Particle, GameState 
} from '../types';
import { 
    WORLD_SIZE, BASE_PLAYER_MASS, MAX_CELLS_PER_PLAYER, 
    VIRUS_MASS, EJECT_MASS, EJECT_COST, MIN_MASS_SPLIT, 
    MIN_MASS_EJECT, TRASH_COUNT, TRASH_TYPES, 
    massToRadius, radiusToMass, BOT_COUNT, BOT_NAMES, BOT_SKINS,
    INERTIA, DECAY_RATE, BASE_SPEED
} from '../constants';
import { useAudio } from '../hooks/useAudio';

interface GameCanvasProps {
    config: GameConfig;
    onGameOver: (score: number) => void;
    onCashOut: (score: number) => void;
    audio: ReturnType<typeof useAudio>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ config, onGameOver, onCashOut, audio }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hudState, setHudState] = useState({ mass: BASE_PLAYER_MASS, rank: 1, inventory: 0 });
    const [portalActive, setPortalActive] = useState(false);
    
    // Game State Refs (Mutable for performance)
    const playersRef = useRef<Player[]>([]);
    const trashRef = useRef<TrashItem[]>([]);
    const virusesRef = useRef<Virus[]>([]);
    const ejectedRef = useRef<EjectedMass[]>([]);
    const portalsRef = useRef<Portal[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
    
    const cameraRef = useRef({ x: WORLD_SIZE/2, y: WORLD_SIZE/2, scale: 1 });
    const mouseRef = useRef<Vector>({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const frameIdRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const shakeRef = useRef<number>(0);
    const hudUpdateTimerRef = useRef<number>(0);

    // --- Helpers ---
    const randomPos = (): Vector => ({
        x: Math.random() * (WORLD_SIZE - 100) + 50,
        y: Math.random() * (WORLD_SIZE - 100) + 50
    });

    const createParticle = (pos: Vector, color: string, speed: number) => {
        const angle = Math.random() * Math.PI * 2;
        particlesRef.current.push({
            id: Math.random().toString(),
            pos: { ...pos },
            radius: Math.random() * 3 + 2,
            color: color,
            rotation: 0,
            mass: 0,
            life: 1.0,
            maxLife: 1.0,
            velocity: {
                x: Math.cos(angle) * speed * Math.random(),
                y: Math.sin(angle) * speed * Math.random()
            }
        });
    };

    const getImage = (src: string): HTMLImageElement | null => {
        if (!src || (!src.startsWith('data:') && !src.startsWith('http'))) return null;
        if (imageCacheRef.current[src]) {
            return imageCacheRef.current[src].complete ? imageCacheRef.current[src] : null;
        }
        const img = new Image();
        img.src = src;
        imageCacheRef.current[src] = img;
        return null; // Return null on first load, will render next frame
    };

    // --- Window Resize Handling ---
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Initialization ---
    useEffect(() => {
        // Init Hero
        playersRef.current.push({
            id: 'hero-1',
            ownerId: 'hero',
            name: config.nickname,
            pos: randomPos(),
            mass: BASE_PLAYER_MASS,
            radius: massToRadius(BASE_PLAYER_MASS),
            color: config.color,
            skin: config.avatar,
            velocity: { x: 0, y: 0 },
            rotation: 0,
            isBot: false,
            creationTime: Date.now(),
            mergeTimestamp: 0,
            invincibleUntil: Date.now() + 3000,
            loot: []
        });

        // Init Bots
        for (let i = 0; i < BOT_COUNT; i++) {
            const mass = BASE_PLAYER_MASS + Math.random() * 50;
            playersRef.current.push({
                id: `bot-${i}`,
                ownerId: `bot-${i}`,
                name: BOT_NAMES[i % BOT_NAMES.length],
                pos: randomPos(),
                mass: mass,
                radius: massToRadius(mass),
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                skin: BOT_SKINS[i % BOT_SKINS.length],
                velocity: { x: 0, y: 0 },
                rotation: Math.random() * Math.PI * 2,
                isBot: true,
                creationTime: Date.now(),
                mergeTimestamp: 0,
                loot: []
            });
        }

        // Init Trash
        for (let i = 0; i < TRASH_COUNT; i++) {
            const typeInfo = TRASH_TYPES.find(t => Math.random() < t.probability) || TRASH_TYPES[0]; // Fallback weighted
            trashRef.current.push({
                id: `trash-${i}`,
                pos: randomPos(),
                mass: typeInfo.value,
                radius: typeInfo.value === 20 ? 14 : typeInfo.value === 5 ? 10 : 7, 
                color: typeInfo.color,
                rotation: Math.random() * Math.PI * 2,
                type: typeInfo.type,
                value: typeInfo.value,
                pulseOffset: Math.random() * 10
            });
        }

        // Init Viruses
        for (let i = 0; i < 20; i++) {
            virusesRef.current.push({
                id: `virus-${i}`,
                pos: randomPos(),
                mass: VIRUS_MASS,
                radius: massToRadius(VIRUS_MASS),
                color: '#33ff33',
                rotation: 0,
                spikes: 12,
                fedMass: 0
            });
        }

        lastTimeRef.current = performance.now();
        const loop = (time: number) => {
            const dt = Math.min((time - lastTimeRef.current) / 16.666, 3); // Normalize to 60fps, cap at 3x
            lastTimeRef.current = time;
            update(dt, time);
            draw();
            frameIdRef.current = requestAnimationFrame(loop);
        };
        frameIdRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(frameIdRef.current);
    }, []);

    // --- Input Handling ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = {
                x: e.clientX - window.innerWidth / 2,
                y: e.clientY - window.innerHeight / 2
            };
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (keysRef.current.has(e.code)) return;
            keysRef.current.add(e.code);
            
            if (e.code === 'Space') splitHero();
            if (e.code === 'KeyW') ejectHero();
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.code);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);


    // --- Mechanics ---

    const splitHero = () => {
        const now = Date.now();
        const heroCells = playersRef.current.filter(p => p.ownerId === 'hero');
        if (heroCells.length >= MAX_CELLS_PER_PLAYER) return;

        let newCells: Player[] = [];

        heroCells.forEach(cell => {
            if (cell.mass < MIN_MASS_SPLIT) return;
            if (heroCells.length + newCells.length >= MAX_CELLS_PER_PLAYER) return;
            
            audio.playSplit();
            const splitMass = cell.mass / 2;
            cell.mass = splitMass;
            cell.radius = massToRadius(splitMass);

            // Calculate split direction (towards mouse)
            const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
            
            newCells.push({
                ...cell,
                id: `hero-${Math.random()}`,
                mass: splitMass,
                radius: massToRadius(splitMass),
                pos: { 
                    x: cell.pos.x + Math.cos(angle) * cell.radius * 2, 
                    y: cell.pos.y + Math.sin(angle) * cell.radius * 2 
                },
                dashVector: {
                    x: Math.cos(angle) * 30,
                    y: Math.sin(angle) * 30
                },
                mergeTimestamp: now + 15000,
                creationTime: now
            });
            cell.mergeTimestamp = now + 15000;
        });
        playersRef.current.push(...newCells);
    };

    const ejectHero = () => {
        const now = Date.now();
        playersRef.current.filter(p => p.ownerId === 'hero').forEach(cell => {
            if (cell.mass < MIN_MASS_EJECT) return;

            audio.playEject();
            cell.mass -= EJECT_COST;
            cell.radius = massToRadius(cell.mass);

            const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
            ejectedRef.current.push({
                id: `eject-${Math.random()}`,
                ownerId: 'hero',
                pos: { 
                    x: cell.pos.x + Math.cos(angle) * cell.radius, 
                    y: cell.pos.y + Math.sin(angle) * cell.radius 
                },
                velocity: {
                    x: Math.cos(angle) * 40,
                    y: Math.sin(angle) * 40
                },
                mass: EJECT_MASS,
                radius: massToRadius(EJECT_MASS),
                color: cell.color,
                rotation: 0,
                creationTime: now
            });
        });
    };

    // --- Update Loop ---
    const update = (dt: number, time: number) => {
        const now = Date.now();

        // 1. Portal Logic
        // Spawn
        if (now % 30000 < 50 && portalsRef.current.length === 0) {
            portalsRef.current.push({
                id: `portal-${now}`,
                pos: randomPos(),
                radius: 100,
                mass: 0,
                color: '#ec4899',
                rotation: 0,
                state: 'SPAWNING',
                timer: 5000,
                maxTimer: 5000
            });
            setPortalActive(true);
        }

        // Update Portals
        portalsRef.current = portalsRef.current.filter(p => {
            p.timer -= dt * 16;
            p.rotation += 0.05 * dt;
            if (p.timer <= 0) {
                if (p.state === 'SPAWNING') {
                    p.state = 'OPEN';
                    p.timer = 20000;
                    p.maxTimer = 20000;
                    return true;
                } else if (p.state === 'OPEN') {
                    p.state = 'CLOSING';
                    p.timer = 2000;
                    p.maxTimer = 2000;
                    return true;
                } else {
                    setPortalActive(false);
                    return false;
                }
            }
            return true;
        });

        // 2. Physics & Player Movement
        playersRef.current.forEach(p => {
            // Decay
            if (p.mass > BASE_PLAYER_MASS) {
                p.mass *= Math.pow(DECAY_RATE, dt);
                p.radius = massToRadius(p.mass);
            }

            // Target Direction
            let tx = 0, ty = 0;
            if (p.ownerId === 'hero') {
                tx = mouseRef.current.x;
                ty = mouseRef.current.y;
            } else {
                // Simple Bot AI
                if (Math.random() < 0.02) p.rotation += (Math.random() - 0.5);
                // Avoid boundaries
                if (p.pos.x < 200) p.rotation = 0;
                if (p.pos.x > WORLD_SIZE - 200) p.rotation = Math.PI;
                if (p.pos.y < 200) p.rotation = Math.PI/2;
                if (p.pos.y > WORLD_SIZE - 200) p.rotation = -Math.PI/2;

                tx = Math.cos(p.rotation) * 1000;
                ty = Math.sin(p.rotation) * 1000;
            }

            // Normalize Speed
            const dist = Math.sqrt(tx*tx + ty*ty);
            const speed = Math.pow(p.mass, -0.43) * BASE_SPEED; 
            
            if (dist > 0) {
                // Throttle speed when mouse is close to allow precision
                let throttle = 1;
                if (p.ownerId === 'hero') {
                     throttle = Math.min(dist / 150, 1);
                }

                const targetVelX = (tx / dist) * speed * throttle;
                const targetVelY = (ty / dist) * speed * throttle;
                
                p.velocity.x += (targetVelX - p.velocity.x) * (1 - INERTIA);
                p.velocity.y += (targetVelY - p.velocity.y) * (1 - INERTIA);
            }

            // Apply Dash/Recoil
            if (p.dashVector) {
                p.velocity.x += p.dashVector.x;
                p.velocity.y += p.dashVector.y;
                p.dashVector.x *= 0.9;
                p.dashVector.y *= 0.9;
                if (Math.abs(p.dashVector.x) < 0.1) p.dashVector = undefined;
            }

            // Move
            p.pos.x += p.velocity.x * dt;
            p.pos.y += p.velocity.y * dt;

            // Clamp
            p.pos.x = Math.max(p.radius, Math.min(WORLD_SIZE - p.radius, p.pos.x));
            p.pos.y = Math.max(p.radius, Math.min(WORLD_SIZE - p.radius, p.pos.y));
        });

        // 3. Ejected Mass Physics
        ejectedRef.current = ejectedRef.current.filter(e => {
            e.pos.x += e.velocity.x * dt;
            e.pos.y += e.velocity.y * dt;
            e.velocity.x *= 0.92; // High friction
            e.velocity.y *= 0.92;

            // Re-absorb check logic handled in collisions
            return true;
        });

        // 4. Collisions & Interactions
        
        // Player-Player & Player-Virus & Player-Trash
        // Sort players by mass (largest first for rendering, but collision logic needs care)
        playersRef.current.sort((a, b) => a.mass - b.mass); 
        
        const consumedTrashIds = new Set<string>();
        const consumedPlayerIds = new Set<string>();
        const consumedEjectIds = new Set<string>();
        const virusHitIds = new Set<string>();

        // Re-combine logic
        for (let i = 0; i < playersRef.current.length; i++) {
            const p1 = playersRef.current[i];
            
            // Wall check for screen shake on hero
            if (p1.ownerId === 'hero' && (p1.pos.x <= p1.radius || p1.pos.x >= WORLD_SIZE - p1.radius || p1.pos.y <= p1.radius || p1.pos.y >= WORLD_SIZE - p1.radius)) {
                 // Slight shake if hitting wall hard
            }

            // Portal Extraction
            if (p1.ownerId === 'hero') {
                const openPortal = portalsRef.current.find(pt => pt.state === 'OPEN');
                if (openPortal) {
                    const d = Math.hypot(p1.pos.x - openPortal.pos.x, p1.pos.y - openPortal.pos.y);
                    if (d < openPortal.radius * 0.5) {
                        // Success!
                        onCashOut(calculateTotalScore());
                        return;
                    }
                }
            }

            // Check Virus
            if (!consumedPlayerIds.has(p1.id)) {
                 virusesRef.current.forEach(v => {
                     const d = Math.hypot(p1.pos.x - v.pos.x, p1.pos.y - v.pos.y);
                     if (d < p1.radius && p1.mass > v.mass * 1.15) {
                         // Explode!
                         virusHitIds.add(v.id); // Remove virus
                         if (p1.ownerId === 'hero') {
                             shakeRef.current = 20;
                             audio.playVirus();
                         }
                         p1.mass /= 2;
                         p1.radius = massToRadius(p1.mass);
                         createParticle(p1.pos, '#00ff00', 10);
                     }
                 });
            }

            // Check Trash
            trashRef.current.forEach(t => {
                if (consumedTrashIds.has(t.id)) return;
                const dist = Math.hypot(p1.pos.x - t.pos.x, p1.pos.y - t.pos.y);
                if (dist < p1.radius) {
                    consumedTrashIds.add(t.id);
                    p1.mass += t.value;
                    p1.radius = massToRadius(p1.mass);
                    if (p1.ownerId === 'hero') {
                        audio.playEat();
                        // Gold particles for coin collect
                        createParticle(t.pos, '#FFD700', 5);
                    }
                }
            });

            // Check Ejected
            ejectedRef.current.forEach(e => {
                if (consumedEjectIds.has(e.id)) return;
                // Can't eat own eject instantly
                if (e.ownerId === p1.ownerId && now - e.creationTime < 300) return;
                
                const dist = Math.hypot(p1.pos.x - e.pos.x, p1.pos.y - e.pos.y);
                if (dist < p1.radius) {
                    consumedEjectIds.add(e.id);
                    p1.mass += e.mass;
                    p1.radius = massToRadius(p1.mass);
                }
            });

            // Check Other Players
            for (let j = 0; j < playersRef.current.length; j++) {
                if (i === j) continue;
                const p2 = playersRef.current[j];
                if (consumedPlayerIds.has(p2.id) || consumedPlayerIds.has(p1.id)) continue;

                const dist = Math.hypot(p1.pos.x - p2.pos.x, p1.pos.y - p2.pos.y);

                // Merge Logic (Same Owner)
                if (p1.ownerId === p2.ownerId) {
                    // Collision push apart
                    if (dist < p1.radius + p2.radius) {
                        const overlap = (p1.radius + p2.radius - dist);
                        const dx = (p1.pos.x - p2.pos.x) / dist;
                        const dy = (p1.pos.y - p2.pos.y) / dist;
                        
                        // If ready to merge
                        if (now > p1.mergeTimestamp && now > p2.mergeTimestamp) {
                            consumedPlayerIds.add(p2.id);
                            p1.mass += p2.mass;
                            p1.radius = massToRadius(p1.mass);
                            createParticle(p1.pos, p1.color, 15);
                        } else {
                            // Push
                            p1.pos.x += dx * overlap * 0.1;
                            p1.pos.y += dy * overlap * 0.1;
                            p2.pos.x -= dx * overlap * 0.1;
                            p2.pos.y -= dy * overlap * 0.1;
                        }
                    }
                } 
                // Eat Logic (Different Owner)
                else {
                    if (dist < p1.radius && p1.mass > p2.mass * 1.15) {
                        // P1 eats P2
                        if (!p2.invincibleUntil || now > p2.invincibleUntil) {
                            consumedPlayerIds.add(p2.id);
                            p1.mass += p2.mass;
                            p1.radius = massToRadius(p1.mass);
                            createParticle(p2.pos, p2.color, 15);
                            if (p1.ownerId === 'hero') {
                                audio.playCashOut();
                                shakeRef.current = 10;
                            }
                        }
                    }
                }
            }
        }

        // Apply Consumptions
        trashRef.current = trashRef.current.filter(t => !consumedTrashIds.has(t.id));
        ejectedRef.current = ejectedRef.current.filter(e => !consumedEjectIds.has(e.id));
        virusesRef.current = virusesRef.current.filter(v => !virusHitIds.has(v.id));
        playersRef.current = playersRef.current.filter(p => !consumedPlayerIds.has(p.id));

        // Respawn Trash
        if (trashRef.current.length < TRASH_COUNT) {
             const typeInfo = TRASH_TYPES.find(t => Math.random() < t.probability) || TRASH_TYPES[0];
             trashRef.current.push({
                id: `trash-${now}-${Math.random()}`,
                pos: randomPos(),
                mass: typeInfo.value,
                radius: typeInfo.value === 20 ? 14 : typeInfo.value === 5 ? 10 : 7,
                color: typeInfo.color,
                rotation: Math.random() * Math.PI * 2,
                type: typeInfo.type,
                value: typeInfo.value,
                pulseOffset: Math.random() * 10
            });
        }

        // Respawn Bots
        if (playersRef.current.filter(p => p.isBot).length < BOT_COUNT - 2) {
             const mass = BASE_PLAYER_MASS + Math.random() * 50;
             playersRef.current.push({
                id: `bot-${now}`,
                ownerId: `bot-${now}`,
                name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
                pos: randomPos(),
                mass: mass,
                radius: massToRadius(mass),
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                skin: BOT_SKINS[Math.floor(Math.random() * BOT_SKINS.length)],
                velocity: { x: 0, y: 0 },
                rotation: Math.random() * Math.PI * 2,
                isBot: true,
                creationTime: now,
                mergeTimestamp: 0,
                loot: []
            });
        }

        // Check Game Over
        const heroAlive = playersRef.current.some(p => p.ownerId === 'hero');
        if (!heroAlive) {
            onGameOver(0);
        }

        // Update Camera
        const heroCells = playersRef.current.filter(p => p.ownerId === 'hero');
        if (heroCells.length > 0) {
            let cx = 0, cy = 0, totalM = 0;
            heroCells.forEach(p => {
                cx += p.pos.x * p.mass;
                cy += p.pos.y * p.mass;
                totalM += p.mass;
            });
            const targetX = cx / totalM;
            const targetY = cy / totalM;
            
            // Screen Shake
            let sx = 0, sy = 0;
            if (shakeRef.current > 0.5) {
                sx = (Math.random() - 0.5) * shakeRef.current;
                sy = (Math.random() - 0.5) * shakeRef.current;
                shakeRef.current *= 0.9;
            }

            cameraRef.current.x += (targetX - cameraRef.current.x) * 0.1;
            cameraRef.current.y += (targetY - cameraRef.current.y) * 0.1;
            
            // Zoom based on mass
            const targetScale = Math.max(0.1, Math.pow(Math.min(64 / (totalM + 100), 1), 0.4));
            cameraRef.current.scale += (targetScale - cameraRef.current.scale) * 0.05;

            // Throttled HUD Update
            if (now - hudUpdateTimerRef.current > 100) { // 10Hz
                setHudState({
                    mass: Math.floor(totalM),
                    rank: 1, 
                    inventory: 0 
                });
                hudUpdateTimerRef.current = now;
            }
        }

        // Particles
        particlesRef.current.forEach(p => {
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;
            p.life -= 0.02;
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    };

    const calculateTotalScore = () => {
         const heroCells = playersRef.current.filter(p => p.ownerId === 'hero');
         const mass = heroCells.reduce((acc, p) => acc + p.mass, 0);
         return Math.floor(mass);
    };

    // --- Drawing ---
    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const cam = cameraRef.current;

        // Efficient Clear
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(cam.scale, cam.scale);
        ctx.translate(-cam.x, -cam.y);

        // Draw Map Boundary
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 50;
        ctx.strokeRect(-25, -25, WORLD_SIZE + 50, WORLD_SIZE + 50);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const gridSize = 100;
        const startX = Math.floor((cam.x - (width/cam.scale)/2) / gridSize) * gridSize;
        const endX = Math.ceil((cam.x + (width/cam.scale)/2) / gridSize) * gridSize;
        const startY = Math.floor((cam.y - (height/cam.scale)/2) / gridSize) * gridSize;
        const endY = Math.ceil((cam.y + (height/cam.scale)/2) / gridSize) * gridSize;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();

        // Draw Trash (Now with Icons)
        trashRef.current.forEach(t => {
            if (t.pos.x < startX || t.pos.x > endX || t.pos.y < startY || t.pos.y > endY) return; // Cull
            
            const r = t.radius;
            
            ctx.save();
            ctx.translate(t.pos.x, t.pos.y);
            // Optional: Rotate coins slowly. 
            // ctx.rotate(Date.now() / 1000 + t.id.charCodeAt(0));
            
            // Coin Body (Gradient)
            const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
            grad.addColorStop(0, '#FFF7CC'); // Highlight
            grad.addColorStop(0.4, t.color); // Color
            grad.addColorStop(1, '#666'); // Shadow
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            
            // Icon
            const typeDef = TRASH_TYPES.find(td => td.type === t.type);
            if (typeDef?.icon && r > 5) {
                 ctx.font = `${r * 1.5}px Arial`; 
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 // Slight offset to center visually
                 ctx.fillText(typeDef.icon, 0, 2); 
            }

            ctx.restore();
        });

        // Draw Ejected Mass
        ejectedRef.current.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Draw Portals
        portalsRef.current.forEach(p => {
            const opacity = p.state === 'SPAWNING' || p.state === 'CLOSING' 
                ? (p.maxTimer - p.timer) / p.maxTimer 
                : 1;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(p.pos.x, p.pos.y);
            ctx.rotate(p.rotation);
            
            // Outer Ring
            const grad = ctx.createRadialGradient(0,0, 50, 0,0, 100);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0,0, 100, 0, Math.PI*2);
            ctx.fill();

            // Inner Text
            ctx.rotate(-p.rotation); // Stable text
            ctx.fillStyle = 'white';
            ctx.font = '10px Rubik';
            ctx.textAlign = 'center';
            if (p.state === 'OPEN') ctx.fillText("EXTRACTION POINT", 0, -60);
            
            ctx.restore();
        });

        // Draw Viruses
        virusesRef.current.forEach(v => {
            ctx.fillStyle = '#33ff33';
            ctx.shadowColor = '#33ff33';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            const spikes = 20;
            const innerRadius = v.radius;
            const outerRadius = v.radius + 5;
            
            for (let i = 0; i < spikes; i++) {
                let angle = (i / spikes) * Math.PI * 2;
                ctx.lineTo(Math.cos(angle) * outerRadius + v.pos.x, Math.sin(angle) * outerRadius + v.pos.y);
                angle += Math.PI / spikes;
                ctx.lineTo(Math.cos(angle) * innerRadius + v.pos.x, Math.sin(angle) * innerRadius + v.pos.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(v.pos.x, v.pos.y, v.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Players
        // Sort smallest mass first so they are on top
        const sortedPlayers = [...playersRef.current].sort((a,b) => a.mass - b.mass);
        
        sortedPlayers.forEach(p => {
             // 3D Sphere Effect
             const r = p.radius;
             const grad = ctx.createRadialGradient(p.pos.x - r*0.3, p.pos.y - r*0.3, r*0.1, p.pos.x, p.pos.y, r);
             grad.addColorStop(0, p.color); // Light
             grad.addColorStop(1, 'black'); // Shadow
             
             ctx.fillStyle = grad;
             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, r, 0, Math.PI * 2);
             ctx.fill();
             
             // Custom Image Skin?
             const img = getImage(p.skin);
             if (img) {
                 ctx.save();
                 ctx.beginPath();
                 ctx.arc(p.pos.x, p.pos.y, r * 0.95, 0, Math.PI * 2);
                 ctx.clip();
                 ctx.drawImage(img, p.pos.x - r, p.pos.y - r, r*2, r*2);
                 ctx.restore();
             }

             // Rim light
             ctx.strokeStyle = 'rgba(255,255,255,0.2)';
             ctx.lineWidth = 2;
             ctx.stroke();

             // Invincibility ring
             if (p.invincibleUntil && p.invincibleUntil > Date.now()) {
                 ctx.strokeStyle = `rgba(255,255,255,${Math.sin(Date.now()/100) * 0.5 + 0.5})`;
                 ctx.lineWidth = 4;
                 ctx.setLineDash([10, 10]);
                 ctx.beginPath();
                 ctx.arc(p.pos.x, p.pos.y, r + 10, 0, Math.PI * 2);
                 ctx.stroke();
                 ctx.setLineDash([]);
             }

             // Info
             ctx.fillStyle = 'white';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.shadowColor = 'black';
             ctx.shadowBlur = 4;

             // Only draw emoji text if NOT an image
             if (!img) {
                 ctx.font = `bold ${Math.max(12, r * 0.4)}px Rubik`;
                 ctx.fillText(p.skin, p.pos.x, p.pos.y);
             }
             
             ctx.font = `bold ${Math.max(10, r * 0.3)}px Rubik`;
             ctx.fillText(p.name, p.pos.x, p.pos.y - r - 10);
             
             ctx.font = `${Math.max(8, r * 0.2)}px Rubik`;
             ctx.fillText(Math.floor(p.mass).toString(), p.pos.x, p.pos.y + r + 15);
             ctx.shadowBlur = 0;
        });

        // Draw Particles
        particlesRef.current.forEach(p => {
             ctx.globalAlpha = p.life;
             ctx.fillStyle = p.color;
             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
             ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.restore();
    };

    return (
        <div className="relative w-full h-full bg-black">
            <canvas ref={canvasRef} className="block cursor-crosshair" />
            
            {/* HUD */}
            <div className="absolute top-4 left-4 glass-panel p-4 rounded-lg min-w-[200px] pointer-events-none">
                <div className="text-xs text-gray-400 font-mono">CURRENT MASS</div>
                <div className="text-3xl font-black text-white">{hudState.mass}</div>
                <div className="w-full h-2 bg-gray-800 rounded mt-2 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300" 
                        style={{ width: `${Math.min((hudState.mass / 2000) * 100, 100)}%` }}
                    />
                </div>
            </div>

            <div className="absolute top-4 right-4 glass-panel p-4 rounded-lg pointer-events-none">
                 <div className="text-xs text-gray-400 font-mono mb-2">LEADERBOARD</div>
                 {playersRef.current
                    .sort((a,b) => b.mass - a.mass)
                    .slice(0, 5)
                    .map((p, i) => (
                        <div key={p.id} className="flex justify-between w-48 text-sm mb-1">
                            <span className={`${p.ownerId === 'hero' ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                                {i+1}. {p.name}
                            </span>
                            <span className="text-gray-500">{Math.floor(p.mass)}</span>
                        </div>
                    ))
                 }
            </div>

            <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-lg pointer-events-none">
                <div className="text-xs font-mono text-gray-400">CONTROLS</div>
                <div className="text-sm font-bold flex gap-4 mt-1">
                    <span><span className="text-yellow-400">[SPACE]</span> SPLIT</span>
                    <span><span className="text-yellow-400">[W]</span> EJECT</span>
                </div>
            </div>

            {/* Portal Alert */}
            {portalActive && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 animate-pulse pointer-events-none">
                    <div className="glass-panel px-6 py-2 rounded-full border border-pink-500 bg-pink-500/10">
                        <span className="text-pink-400 font-black tracking-widest uppercase">Portal Signal Detected</span>
                    </div>
                </div>
            )}
        </div>
    );
};