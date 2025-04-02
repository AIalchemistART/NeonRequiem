// physics.js - Modular physics helper for Neon Requiem
export class Physics {
    /**
     * Constructor for the Physics class.
     * @param {number} elasticity - Coefficient of restitution for collisions (0-1, default 0.3)
     */
    constructor(elasticity = 0.3) {
        // Enhanced physics properties with vector-based gravity
        this.gravity = { x: 0, y: 0 }; // Vector-based gravity allows for directional forces
        this.frictionCoefficient = 1.0; // Default friction (1.0 = medium friction)
        this.elasticity = elasticity; // Bounciness of collisions
        
        // Environmental presets for quick configuration
        this.environments = {
            normal: { 
                friction: 1.0, 
                gravity: { x: 0, y: 0 } 
            },
            ice: { 
                friction: 0.1, 
                gravity: { x: 0, y: 0 } 
            },
            mud: { 
                friction: 2.5, 
                gravity: { x: 0, y: 0 } 
            },
            space: { 
                friction: 0.05, 
                gravity: { x: 0, y: 0 } 
            },
            water: { 
                friction: 1.8, 
                gravity: { x: 0, y: 0.3 } 
            },
            antigravity: { 
                friction: 0.8, 
                gravity: { x: 0, y: -0.5 } 
            }
        };
    }
    
    /**
     * Generic collision detection between any two entities
     * @param {Object} entity1 - First entity with x, y and either radius or width/height properties
     * @param {Object} entity2 - Second entity with x, y and either radius or width/height properties
     * @returns {boolean} Whether the entities are colliding
     */
    checkCollision(entity1, entity2) {
        // Handle polygon collision if both entities have vertices
        if (entity1.vertices !== undefined && entity2.vertices !== undefined) {
            return this.checkPolygonCollision(entity1, entity2);
        }
        
        // Handle polygon-rect collision
        if (entity1.vertices !== undefined && entity2.width !== undefined) {
            // Convert rect to polygon and use polygon collision
            const rectAsPolygon = this.rectToPolygon(entity2);
            return this.checkPolygonCollision(entity1, rectAsPolygon);
        }
        
        if (entity1.width !== undefined && entity2.vertices !== undefined) {
            // Convert rect to polygon and use polygon collision
            const rectAsPolygon = this.rectToPolygon(entity1);
            return this.checkPolygonCollision(rectAsPolygon, entity2);
        }
        
        // Handle polygon-circle collision
        if (entity1.vertices !== undefined && entity2.radius !== undefined) {
            return this.checkPolygonCircleCollision(entity1, entity2);
        }
        
        if (entity1.radius !== undefined && entity2.vertices !== undefined) {
            return this.checkPolygonCircleCollision(entity2, entity1);
        }
        
        // Handle circle-circle collision if both entities have radius
        if (entity1.radius !== undefined && entity2.radius !== undefined) {
            return this.checkCircleCollision(entity1, entity2);
        }
        
        // Handle rect-rect collision if both entities have width/height
        if (entity1.width !== undefined && entity2.width !== undefined) {
            return this.checkRectCollision(entity1, entity2);
        }
        
        // Handle mixed circle-rect collisions
        if (entity1.radius !== undefined && entity2.width !== undefined) {
            return this.checkCircleRectCollision(entity1, entity2);
        }
        
        if (entity1.width !== undefined && entity2.radius !== undefined) {
            return this.checkCircleRectCollision(entity2, entity1);
        }
        
        // Fallback to basic point collision if no dimensions provided
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < 10; // Default small collision radius
    }
    
    /**
     * Circle-to-circle collision detection
     * @param {Object} circle1 - First circle with x, y, radius properties
     * @param {Object} circle2 - Second circle with x, y, radius properties
     * @returns {boolean} Whether the circles are colliding
     */
    checkCircleCollision(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < circle1.radius + circle2.radius;
    }
    
    /**
     * Rectangle collision detection (for walls, doors, etc.)
     * @param {Object} rect1 - First rectangle with x, y, width, height properties
     * @param {Object} rect2 - Second rectangle with x, y, width, height properties
     * @returns {boolean} Whether the rectangles are colliding
     */
    checkRectCollision(rect1, rect2) {
        // For entities with centered positions, adjust to top-left corner
        const r1 = this.normalizeRect(rect1);
        const r2 = this.normalizeRect(rect2);
        
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    }
    
    /**
     * Circle-to-rectangle collision detection
     * @param {Object} circle - Circle with x, y, radius properties
     * @param {Object} rect - Rectangle with x, y, width, height properties
     * @returns {boolean} Whether the circle and rectangle are colliding
     */
    checkCircleRectCollision(circle, rect) {
        // Normalize rectangle to account for centered or top-left origin
        const r = this.normalizeRect(rect);
        
        // Find the closest point on the rectangle to the circle center
        const closestX = Math.max(r.x, Math.min(circle.x, r.x + r.width));
        const closestY = Math.max(r.y, Math.min(circle.y, r.y + r.height));
        
        // Calculate distance between the closest point and circle center
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        
        return distanceSquared <= (circle.radius * circle.radius);
    }
    
    /**
     * Normalizes a rectangle to ensure consistent collision detection
     * @param {Object} rect - Rectangle with x, y, width, height properties
     * @returns {Object} Normalized rectangle with top-left coordinates
     */
    normalizeRect(rect) {
        // Check if the rectangle uses centered coordinates
        if (rect.isCentered || rect.center) {
            return {
                x: rect.x - rect.width / 2,
                y: rect.y - rect.height / 2,
                width: rect.width,
                height: rect.height
            };
        }
        return rect;
    }
    
    /**
     * Polygon collision detection using Separating Axis Theorem (SAT)
     * @param {Object} poly1 - First polygon with x, y, vertices properties
     * @param {Object} poly2 - Second polygon with x, y, vertices properties
     * @returns {boolean} Whether the polygons are colliding
     */
    checkPolygonCollision(poly1, poly2) {
        // Get the absolute vertices (world coordinates) for both polygons
        const vertices1 = this.getAbsoluteVertices(poly1);
        const vertices2 = this.getAbsoluteVertices(poly2);
        
        // Get axes to test (normals of each edge of both polygons)
        const axes1 = this.getPolygonAxes(vertices1);
        const axes2 = this.getPolygonAxes(vertices2);
        
        // Combine axes from both polygons
        const axes = [...axes1, ...axes2];
        
        // Test each axis (SAT core principle)
        for (let i = 0; i < axes.length; i++) {
            const axis = axes[i];
            
            // Project both polygons onto the axis
            const projection1 = this.projectPolygonOntoAxis(vertices1, axis);
            const projection2 = this.projectPolygonOntoAxis(vertices2, axis);
            
            // If projections don't overlap, polygons don't collide
            if (projection1.max < projection2.min || projection2.max < projection1.min) {
                return false; // Separating axis found, no collision
            }
        }
        
        // No separating axis found, polygons must be colliding
        return true;
    }
    
    /**
     * Convert relative polygon vertices to absolute world coordinates
     * @param {Object} polygon - Polygon with x, y, vertices properties
     * @returns {Array} Array of vertex positions in world coordinates
     */
    getAbsoluteVertices(polygon) {
        const absVertices = [];
        for (let i = 0; i < polygon.vertices.length; i++) {
            const vertex = polygon.vertices[i];
            absVertices.push({
                x: polygon.x + vertex.x,
                y: polygon.y + vertex.y
            });
        }
        return absVertices;
    }
    
    /**
     * Get axes (normals) for a polygon to use in SAT
     * @param {Array} vertices - Array of vertices in world coordinates
     * @returns {Array} Array of normalized axis vectors perpendicular to each edge
     */
    getPolygonAxes(vertices) {
        const axes = [];
        const vertexCount = vertices.length;
        
        for (let i = 0; i < vertexCount; i++) {
            // Get current vertex and next vertex (wrapping around to first for last edge)
            const current = vertices[i];
            const next = vertices[(i + 1) % vertexCount];
            
            // Get edge vector
            const edge = {
                x: next.x - current.x,
                y: next.y - current.y
            };
            
            // Get perpendicular (normal) to edge
            const normal = {
                x: -edge.y,
                y: edge.x
            };
            
            // Normalize the normal
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            normal.x /= length;
            normal.y /= length;
            
            axes.push(normal);
        }
        
        return axes;
    }
    
    /**
     * Project polygon onto an axis
     * @param {Array} vertices - Array of vertices in world coordinates
     * @param {Object} axis - Normalized axis vector {x, y}
     * @returns {Object} Min and max projection values {min, max}
     */
    projectPolygonOntoAxis(vertices, axis) {
        let min = Number.MAX_VALUE;
        let max = -Number.MAX_VALUE;
        
        // Project each vertex onto the axis
        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];
            const projection = vertex.x * axis.x + vertex.y * axis.y;
            
            if (projection < min) min = projection;
            if (projection > max) max = projection;
        }
        
        return { min, max };
    }
    
    /**
     * Convert a rectangle to a polygon
     * @param {Object} rect - Rectangle with x, y, width, height properties
     * @returns {Object} Polygon representation of the rectangle
     */
    rectToPolygon(rect) {
        const r = this.normalizeRect(rect);
        
        return {
            x: r.x,
            y: r.y,
            vertices: [
                { x: 0, y: 0 },                // Top-left
                { x: r.width, y: 0 },          // Top-right
                { x: r.width, y: r.height },   // Bottom-right
                { x: 0, y: r.height }          // Bottom-left
            ]
        };
    }
    
    /**
     * Polygon-to-circle collision detection
     * @param {Object} poly - Polygon with x, y, vertices properties
     * @param {Object} circle - Circle with x, y, radius properties
     * @returns {boolean} Whether the polygon and circle are colliding
     */
    checkPolygonCircleCollision(poly, circle) {
        // Get the absolute vertices (world coordinates) for the polygon
        const vertices = this.getAbsoluteVertices(poly);
        
        // Check if the circle center is inside the polygon
        if (this.isPointInPolygon({ x: circle.x, y: circle.y }, vertices)) {
            return true;
        }
        
        // Check if any edge of the polygon intersects with the circle
        const vertexCount = vertices.length;
        for (let i = 0; i < vertexCount; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % vertexCount];
            
            // Check if circle collides with the edge
            if (this.isCircleCollidingWithLine(circle, current, next)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Checks if a point is inside a polygon
     * @param {Object} point - Point with x, y properties
     * @param {Array} vertices - Array of vertices in world coordinates
     * @returns {boolean} Whether the point is inside the polygon
     */
    isPointInPolygon(point, vertices) {
        let inside = false;
        const vertexCount = vertices.length;
        
        // Ray casting algorithm
        for (let i = 0, j = vertexCount - 1; i < vertexCount; j = i++) {
            const vi = vertices[i];
            const vj = vertices[j];
            
            if (((vi.y > point.y) !== (vj.y > point.y)) &&
                (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * Checks if a circle collides with a line segment
     * @param {Object} circle - Circle with x, y, radius properties
     * @param {Object} lineStart - Line start point with x, y properties
     * @param {Object} lineEnd - Line end point with x, y properties
     * @returns {boolean} Whether the circle and line segment collide
     */
    isCircleCollidingWithLine(circle, lineStart, lineEnd) {
        // Vector from line start to line end
        const lineVectorX = lineEnd.x - lineStart.x;
        const lineVectorY = lineEnd.y - lineStart.y;
        
        // Vector from line start to circle center
        const circleVectorX = circle.x - lineStart.x;
        const circleVectorY = circle.y - lineStart.y;
        
        // Length of line
        const lineLength = Math.sqrt(lineVectorX * lineVectorX + lineVectorY * lineVectorY);
        
        // Normalize line vector
        const normalizedLineX = lineVectorX / lineLength;
        const normalizedLineY = lineVectorY / lineLength;
        
        // Project circle center onto line
        const projection = circleVectorX * normalizedLineX + circleVectorY * normalizedLineY;
        
        // Clamp projection to line segment
        const clampedProjection = Math.max(0, Math.min(lineLength, projection));
        
        // Find the closest point on the line to the circle center
        const closestPointX = lineStart.x + clampedProjection * normalizedLineX;
        const closestPointY = lineStart.y + clampedProjection * normalizedLineY;
        
        // Distance from closest point to circle center
        const distanceX = circle.x - closestPointX;
        const distanceY = circle.y - closestPointY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        // Check if distance is less than circle radius squared
        return distanceSquared <= (circle.radius * circle.radius);
    }
    
    /**
     * Calculate collision response between two entities
     * @param {Object} entity1 - First entity with x, y, velocityX, velocityY properties
     * @param {Object} entity2 - Second entity with x, y, velocityX, velocityY properties
     * @returns {Object} Collision response vector {x, y, normal}
     */
    calculateCollisionResponse(entity1, entity2) {
        // Calculate collision normal (direction from entity1 to entity2)
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize the collision normal
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        return {
            x: normalX,
            y: normalY,
            normal: { x: normalX, y: normalY },
            distance: distance
        };
    }
    
    /**
     * Apply vector force to an entity (useful for knockback, explosions)
     * @param {Object} entity - Entity with x, y, velocityX, velocityY properties (defender)
     * @param {number} forceX - X component of the force
     * @param {number} forceY - Y component of the force
     * @param {number} duration - Duration of the force application in ms
     * @param {number} mass - Mass of the entity (default: 1)
     * @param {Object} attacker - Optional attacker entity with speed, mass, knockbackMultiplier
     */
    applyForce(entity, forceX, forceY, duration = 200, mass = 1, attacker = null) {
        // Get entity mass (default to provided mass if entity.mass is undefined)
        const entityMass = entity.mass !== undefined ? entity.mass : mass;
        
        // Get entity knockback resistance (1.0 means normal knockback)
        const knockbackResistance = entity.knockbackResistance !== undefined ? entity.knockbackResistance : 1.0;
        
        // Calculate force magnitude
        let forceMagnitude = Math.sqrt(forceX * forceX + forceY * forceY);
        
        // If attacker is provided, calculate dynamic knockback based on attacker properties
        if (attacker) {
            // Get attacker speed if available, otherwise use force magnitude
            const attackerSpeed = this.getEntitySpeed(attacker);
            
            // Get attacker's knockback multiplier (default to 1 if not defined)
            const knockbackMultiplier = attacker.knockbackMultiplier !== undefined ? 
                attacker.knockbackMultiplier : 1.0;
                
            // Get attacker mass (default to 1 if not defined)
            const attackerMass = attacker.mass !== undefined ? attacker.mass : 1.0;
            
            // Calculate dynamic force using attacker properties
            // Formula: (attacker speed * knockback multiplier * attacker mass) / (defender mass * knockback resistance)
            forceMagnitude = (attackerSpeed * knockbackMultiplier * attackerMass) / 
                             (entityMass * knockbackResistance);
                             
            // Add weapon/attack specific bonus if available
            if (attacker.attackKnockbackBonus !== undefined) {
                forceMagnitude += attacker.attackKnockbackBonus;
            }
            
            // Scale based on critical hits
            if (attacker.isCriticalHit) {
                forceMagnitude *= (attacker.criticalKnockbackMultiplier || 1.5);
            }
        }
        
        // Normalize the force direction
        const forceNorm = forceMagnitude > 0 ? forceMagnitude : 1;
        const normalizedForceX = forceX / forceNorm;
        const normalizedForceY = forceY / forceNorm;
        
        // Apply normalized direction with calculated magnitude
        const finalForceX = normalizedForceX * forceMagnitude;
        const finalForceY = normalizedForceY * forceMagnitude;
        
        // Cap maximum knockback if entity has a limit defined
        let knockbackSpeed = entity.maxKnockbackSpeed !== undefined ?
            Math.min(300 * forceMagnitude, entity.maxKnockbackSpeed) : 
            300 * forceMagnitude;
            
        // We won't directly modify entity movement but setup parameters for their movement system
        if (entity.applyKnockback) {
            // For entities that already have knockback functionality
            const direction = { 
                x: normalizedForceX, 
                y: normalizedForceY 
            };
            entity.applyKnockback(direction, forceMagnitude);
        } else if (entity.knockbackActive !== undefined) {
            // Initialize knockback properties if they don't exist
            entity.knockbackActive = true;
            entity.knockbackTimer = duration;
            entity.knockbackDirection = { 
                x: normalizedForceX, 
                y: normalizedForceY 
            };
            entity.knockbackSpeed = knockbackSpeed;
            
            // Add knockback data for debugging and effects
            entity.lastKnockback = {
                force: forceMagnitude,
                attacker: attacker ? attacker.id || 'unknown' : null,
                timestamp: Date.now()
            };
        }
        
        // Return the modified entity to allow for chaining
        return entity;
    }
    
    /**
     * Calculate the current speed of an entity
     * @param {Object} entity - Entity with velocityX and velocityY properties
     * @returns {number} Current speed magnitude
     */
    getEntitySpeed(entity) {
        if (!entity) return 0;
        
        // If entity has a speed property, use that
        if (entity.speed !== undefined) {
            return entity.speed;
        }
        
        // Otherwise calculate from velocity components
        const vx = entity.velocityX || 0;
        const vy = entity.velocityY || 0;
        return Math.sqrt(vx * vx + vy * vy);
    }
    
    /**
     * Check if a ray intersects with a line segment
     * @param {Object} rayOrigin - Ray origin point {x, y}
     * @param {Object} rayDirection - Ray direction vector {x, y}
     * @param {Object} lineStart - Line segment start point {x, y}
     * @param {Object} lineEnd - Line segment end point {x, y}
     * @returns {Object|null} Intersection point or null if no intersection
     */
    raycast(rayOrigin, rayDirection, lineStart, lineEnd) {
        // Ray formula: rayOrigin + t * rayDirection
        // Line formula: lineStart + s * (lineEnd - lineStart)
        const x1 = lineStart.x;
        const y1 = lineStart.y;
        const x2 = lineEnd.x;
        const y2 = lineEnd.y;
        
        const x3 = rayOrigin.x;
        const y3 = rayOrigin.y;
        const x4 = rayOrigin.x + rayDirection.x;
        const y4 = rayOrigin.y + rayDirection.y;
        
        const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        
        // Lines are parallel
        if (denominator === 0) {
            return null;
        }
        
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
        
        // Check if intersection is within line segment
        if (ua < 0 || ua > 1 || ub < 0) {
            return null;
        }
        
        // Calculate intersection point
        const intersectionX = x1 + ua * (x2 - x1);
        const intersectionY = y1 + ua * (y2 - y1);
        
        return {
            x: intersectionX,
            y: intersectionY,
            distance: Math.sqrt(Math.pow(intersectionX - rayOrigin.x, 2) + 
                               Math.pow(intersectionY - rayOrigin.y, 2))
        };
    }
    
    /**
     * Updates entity position based on its velocity and applies physics forces
     * @param {Object} entity - Entity with x, y, velocityX, velocityY properties
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @returns {Object} The updated entity
     */
    move(entity, deltaTime) {
        // Skip movement for inactive entities
        if (entity.active === false) return entity;
        
        // If the entity has its own movement logic, respect that
        if (entity.update && !entity._physicsControlled) {
            return entity; // Let the entity handle its own movement
        }
        
        // Convert deltaTime to seconds
        const dt = deltaTime / 1000;
        
        // Handle knockback if applicable
        if (entity.knockbackActive) {
            const knockbackMove = this.handleKnockbackMovement(entity, dt);
            if (knockbackMove) return entity; // Knockback was applied, skip normal movement
        }
        
        // Handle dash if applicable (for player)
        if (entity.isDashing) {
            const dashMove = this.handleDashMovement(entity, dt);
            if (dashMove) return entity; // Dash was applied, skip normal movement
        }
        
        // Apply velocity to position
        entity.x += entity.velocityX * dt;
        entity.y += entity.velocityY * dt;
        
        // Get entity-specific friction if available, or use global friction
        const friction = entity.friction !== undefined ? entity.friction : this.frictionCoefficient;
        
        // Apply friction based on surface type
        if (friction > 0 && !entity.noFriction) {
            // Calculate friction force based on velocity magnitude and direction
            const velocityMagnitude = Math.sqrt(
                entity.velocityX * entity.velocityX + 
                entity.velocityY * entity.velocityY
            );
            
            if (velocityMagnitude > 0) {
                // Normalize velocity to get direction
                const directionX = entity.velocityX / velocityMagnitude;
                const directionY = entity.velocityY / velocityMagnitude;
                
                // Calculate friction force magnitude
                const frictionForce = friction * dt;
                
                // Apply friction
                if (entity.onIce) {
                    // Less friction on ice
                    entity.velocityX *= (1 - 0.1 * frictionForce);
                    entity.velocityY *= (1 - 0.1 * frictionForce);
                } else if (entity.inWater) {
                    // More friction in water, plus slight directional resistance
                    entity.velocityX *= (1 - 1.8 * frictionForce);
                    entity.velocityY *= (1 - 1.5 * frictionForce);
                } else if (entity.inMud) {
                    // Strong friction in mud
                    entity.velocityX *= (1 - 2.5 * frictionForce);
                    entity.velocityY *= (1 - 2.5 * frictionForce);
                } else {
                    // Standard friction
                    entity.velocityX *= (1 - frictionForce);
                    entity.velocityY *= (1 - frictionForce);
                }
                
                // Zero out very small velocities to prevent sliding
                const velocityThreshold = entity.velocityThreshold || 0.1;
                if (Math.abs(entity.velocityX) < velocityThreshold) entity.velocityX = 0;
                if (Math.abs(entity.velocityY) < velocityThreshold) entity.velocityY = 0;
            }
        }
        
        // Get entity-specific gravity if available, or use global gravity
        const gravity = entity.gravity !== undefined ? entity.gravity : this.gravity;
        
        // Apply gravity
        if ((gravity.x !== 0 || gravity.y !== 0) && !entity.noGravity) {
            // Apply gravity vector - now supports both x and y components
            entity.velocityX += gravity.x * dt;
            entity.velocityY += gravity.y * dt;
            
            // Apply terminal velocity if set
            if (entity.terminalVelocity !== undefined) {
                const tv = entity.terminalVelocity;
                if (entity.velocityX > tv) entity.velocityX = tv;
                if (entity.velocityX < -tv) entity.velocityX = -tv;
                if (entity.velocityY > tv) entity.velocityY = tv;
                if (entity.velocityY < -tv) entity.velocityY = -tv;
            }
        }
        
        return entity;
    }
    
    /**
     * Handles knockback movement for an entity
     * @param {Object} entity - Entity with knockback properties
     * @param {number} dt - Delta time in seconds
     * @returns {boolean} Whether knockback was applied
     */
    handleKnockbackMovement(entity, dt) {
        if (!entity.knockbackActive) return false;
        
        entity.knockbackTimer -= dt * 1000; // Convert dt back to ms for the timer
        
        if (entity.knockbackTimer <= 0) {
            entity.knockbackActive = false;
            return false;
        }
        
        // Apply knockback movement
        const knockbackDistance = entity.knockbackSpeed * dt;
        entity.x += entity.knockbackDirection.x * knockbackDistance;
        entity.y += entity.knockbackDirection.y * knockbackDistance;
        
        return true;
    }
    
    /**
     * Handles dash movement for an entity (typically player)
     * @param {Object} entity - Entity with dash properties
     * @param {number} dt - Delta time in seconds
     * @returns {boolean} Whether dash was applied
     */
    handleDashMovement(entity, dt) {
        if (!entity.isDashing) return false;
        
        entity.dashTimer -= dt * 1000; // Convert dt back to ms for the timer
        
        if (entity.dashTimer <= 0) {
            entity.isDashing = false;
            return false;
        }
        
        // Apply dash movement
        entity.x += entity.dashDirection.x * entity.dashSpeed * dt;
        entity.y += entity.dashDirection.y * entity.dashSpeed * dt;
        
        // Store position for trail effect if applicable
        if (entity.trailPositions) {
            if (entity.trailPositions.length >= entity.trailMaxLength) {
                entity.trailPositions.shift(); // Remove oldest position
            }
            entity.trailPositions.push({ x: entity.x, y: entity.y });
        }
        
        return true;
    }
    
    /**
     * Set environment physics properties (friction, gravity) for an area
     * @param {string} environmentType - Type of environment (e.g., 'ice', 'mud', 'space')
     * @returns {Object} The environment settings object
     */
    setEnvironment(environmentType) {
        const env = this.environments[environmentType];
        if (env) {
            this.frictionCoefficient = env.friction;
            this.gravity = env.gravity;
            return env;
        }
        
        // Default to normal environment if type not found
        return this.environments.normal;
    }
    
    /**
     * Apply environmental effects to an entity based on its position
     * @param {Object} entity - Entity to apply environmental effects to
     * @param {Object} environment - Environment definition with area and physics properties
     * @returns {Object} The updated entity
     */
    applyEnvironmentalEffects(entity, environment) {
        if (!environment || !environment.area) return entity;
        
        // Check if entity is in this environment's area
        const isInArea = this.checkRectCollision(entity, environment.area);
        
        if (isInArea) {
            // Apply environment-specific properties
            entity.friction = environment.friction !== undefined 
                ? environment.friction 
                : this.frictionCoefficient;
                
            entity.gravity = environment.gravity !== undefined 
                ? environment.gravity 
                : this.gravity;
                
            // Set environmental flags
            entity.onIce = environment.type === 'ice';
            entity.inWater = environment.type === 'water';
            entity.inMud = environment.type === 'mud';
            
            // Apply any special effect callbacks
            if (environment.onEnter && !entity._inEnvironment) {
                environment.onEnter(entity);
                entity._inEnvironment = environment.type;
            }
        } else if (entity._inEnvironment === environment.type) {
            // Reset entity when leaving this environment
            entity.friction = undefined;
            entity.gravity = undefined;
            entity.onIce = false;
            entity.inWater = false;
            entity.inMud = false;
            
            // Apply exit callback
            if (environment.onExit) {
                environment.onExit(entity);
            }
            
            entity._inEnvironment = null;
        }
        
        return entity;
    }
    
    /**
     * Calculate correction vector to resolve circle-rectangle collision
     * @param {number} circleX - Circle center X
     * @param {number} circleY - Circle center Y
     * @param {number} circleRadius - Circle radius
     * @param {number} rectX - Rectangle top-left X (or center X if centered)
     * @param {number} rectY - Rectangle top-left Y (or center Y if centered)
     * @param {number} rectWidth - Rectangle width
     * @param {number} rectHeight - Rectangle height
     * @param {boolean} isRectCentered - Whether the rectangle coordinates are for its center
     * @returns {Object} Correction vector {x, y} to apply to the circle position
     */
    getCircleRectCorrection(circleX, circleY, circleRadius, rectX, rectY, rectWidth, rectHeight, isRectCentered = false) {
        // Normalize rectangle to ensure consistent collision detection
        let normalizedRect = {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight
        };
        
        // If rectangle uses centered coordinates, convert to top-left
        if (isRectCentered) {
            normalizedRect.x = rectX - rectWidth / 2;
            normalizedRect.y = rectY - rectHeight / 2;
        }
        
        // Find the closest point on the rectangle to the circle center
        const closestX = Math.max(normalizedRect.x, Math.min(circleX, normalizedRect.x + normalizedRect.width));
        const closestY = Math.max(normalizedRect.y, Math.min(circleY, normalizedRect.y + normalizedRect.height));
        
        // Vector from closest point to circle center
        const distanceX = circleX - closestX;
        const distanceY = circleY - closestY;
        
        // Distance between closest point and circle center
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        // Check if there's actually a collision
        if (distance >= circleRadius) {
            return { x: 0, y: 0 }; // No collision, no correction needed
        }
        
        // Calculate correction vector magnitude
        const correctionMagnitude = circleRadius - distance;
        
        // Normalize the distance vector
        let correctionX = 0;
        let correctionY = 0;
        
        if (distance > 0) {
            // Normal case: circle center is outside the rectangle
            correctionX = (distanceX / distance) * correctionMagnitude;
            correctionY = (distanceY / distance) * correctionMagnitude;
        } else {
            // Edge case: circle center is inside the rectangle
            // Find the shortest way to push the circle out
            const leftDist = circleX - normalizedRect.x;
            const rightDist = (normalizedRect.x + normalizedRect.width) - circleX;
            const topDist = circleY - normalizedRect.y;
            const bottomDist = (normalizedRect.y + normalizedRect.height) - circleY;
            
            // Find the shortest exit distance
            const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
            
            if (minDist === leftDist) {
                correctionX = -minDist - circleRadius;
            } else if (minDist === rightDist) {
                correctionX = minDist + circleRadius;
            } else if (minDist === topDist) {
                correctionY = -minDist - circleRadius;
            } else { // bottomDist
                correctionY = minDist + circleRadius;
            }
        }
        
        return { x: correctionX, y: correctionY };
    }
    
    /**
     * Resolve collision between two entities, pushing the first entity out of the second
     * @param {Object} entity - The entity to resolve (usually the player)
     * @param {Object} obstacle - The obstacle to resolve against (wall, door, etc.)
     * @returns {Object} The updated entity with resolved position
     */
    resolveCollision(entity, obstacle) {
        // Handle different collision types
        if (entity.radius !== undefined) {
            // Entity is a circle (like a player with radius)
            if (obstacle.width !== undefined) {
                // Obstacle is a rectangle (like a wall)
                this.resolveCircleRectCollision(entity, obstacle);
            } else if (obstacle.radius !== undefined) {
                // Obstacle is a circle
                this.resolveCircleCircleCollision(entity, obstacle);
            }
        } else if (entity.width !== undefined) {
            // Entity is a rectangle
            if (obstacle.width !== undefined) {
                // Obstacle is a rectangle
                this.resolveRectRectCollision(entity, obstacle);
            } else if (obstacle.radius !== undefined) {
                // Obstacle is a circle
                this.resolveRectCircleCollision(entity, obstacle);
            }
        }
        
        return entity;
    }
    
    /**
     * Resolve collision between a circle and a rectangle
     * @param {Object} circle - Circle entity (with x, y, radius)
     * @param {Object} rect - Rectangle obstacle (with x, y, width, height)
     */
    resolveCircleRectCollision(circle, rect) {
        // Get the correction vector
        const correction = this.getCircleRectCorrection(
            circle.x, circle.y, circle.radius,
            rect.x, rect.y, rect.width, rect.height,
            rect.isCentered || false
        );
        
        // Apply the correction to move the circle out of the rectangle
        circle.x += correction.x;
        circle.y += correction.y;
        
        // Optionally reduce velocity on collision
        if (circle.velocityX !== undefined && circle.velocityY !== undefined) {
            // Determine which axis had the collision
            const elasticity = this.elasticity;
            
            if (Math.abs(correction.x) > Math.abs(correction.y) && correction.x !== 0) {
                // X-axis collision, reverse X velocity
                circle.velocityX = -circle.velocityX * elasticity;
            } else if (correction.y !== 0) {
                // Y-axis collision, reverse Y velocity
                circle.velocityY = -circle.velocityY * elasticity;
            }
        }
    }
    
    /**
     * Resolve collision between two circles
     * @param {Object} circle1 - First circle entity
     * @param {Object} circle2 - Second circle entity
     */
    resolveCircleCircleCollision(circle1, circle2) {
        // Calculate direction from circle2 to circle1
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            // Circles are exactly on top of each other, move slightly away
            circle1.x += 0.1;
            circle1.y += 0.1;
            return;
        }
        
        // Calculate overlap
        const overlap = (circle1.radius + circle2.radius) - distance;
        
        if (overlap <= 0) {
            return; // No collision
        }
        
        // Move circle1 away from circle2
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        circle1.x += normalX * overlap;
        circle1.y += normalY * overlap;
        
        // Bounce effect if velocity is present
        if (circle1.velocityX !== undefined && circle1.velocityY !== undefined) {
            const elasticity = this.elasticity;
            
            // Calculate dot product of velocity and normal
            const dotProduct = circle1.velocityX * normalX + circle1.velocityY * normalY;
            
            // Only reflect if moving toward the other circle
            if (dotProduct < 0) {
                // Reflect velocity
                circle1.velocityX -= 2 * dotProduct * normalX * elasticity;
                circle1.velocityY -= 2 * dotProduct * normalY * elasticity;
            }
        }
    }
    
    /**
     * Resolve collision between two rectangles
     * @param {Object} rect1 - First rectangle entity
     * @param {Object} rect2 - Second rectangle obstacle
     */
    resolveRectRectCollision(rect1, rect2) {
        // Normalize rectangles to top-left coordinates
        const r1 = this.normalizeRect(rect1);
        const r2 = this.normalizeRect(rect2);
        
        // Calculate overlap in each axis
        const overlapX = Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x);
        const overlapY = Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y);
        
        // Resolve collision by moving rect1 out of rect2
        if (overlapX > 0 && overlapY > 0) {
            // Move in the direction of least overlap
            if (overlapX < overlapY) {
                // Move horizontally
                if (r1.x < r2.x) {
                    rect1.x -= overlapX;
                } else {
                    rect1.x += overlapX;
                }
                
                // Bounce effect if velocity present
                if (rect1.velocityX !== undefined) {
                    rect1.velocityX = -rect1.velocityX * this.elasticity;
                }
            } else {
                // Move vertically
                if (r1.y < r2.y) {
                    rect1.y -= overlapY;
                } else {
                    rect1.y += overlapY;
                }
                
                // Bounce effect if velocity present
                if (rect1.velocityY !== undefined) {
                    rect1.velocityY = -rect1.velocityY * this.elasticity;
                }
            }
        }
    }
    
    /**
     * Resolve collision between a rectangle and a circle (reverse of circle-rect)
     * @param {Object} rect - Rectangle entity
     * @param {Object} circle - Circle obstacle
     */
    resolveRectCircleCollision(rect, circle) {
        // For simplicity, we'll treat this as the opposite case and reverse
        // Create temporary circle
        const tempCircle = {
            x: circle.x,
            y: circle.y,
            radius: circle.radius
        };
        
        // Resolve as if the rectangle is stationary
        this.resolveCircleRectCollision(tempCircle, rect);
        
        // Apply the opposite movement to the rectangle
        rect.x -= (tempCircle.x - circle.x);
        rect.y -= (tempCircle.y - circle.y);
        
        // Adjust rectangle velocity if present
        if (rect.velocityX !== undefined && rect.velocityY !== undefined) {
            const elasticity = this.elasticity;
            const dx = rect.x - circle.x;
            const dy = rect.y - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const normalX = dx / distance;
                const normalY = dy / distance;
                const dotProduct = rect.velocityX * normalX + rect.velocityY * normalY;
                
                if (dotProduct < 0) {
                    rect.velocityX -= 2 * dotProduct * normalX * elasticity;
                    rect.velocityY -= 2 * dotProduct * normalY * elasticity;
                }
            }
        }
    }
}
