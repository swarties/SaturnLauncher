import { motion } from 'motion/react';
import { cn } from 'cn';

function ShimmeringText({
  text,
  duration = 1,
  transition,
  wave = false,
  className,
  color = 'var(--color-neutral-500)',
  shimmeringColor = 'var(--color-neutral-300)',
  ...props
}) {
  return (
    <motion.span
      className={cn('relative inline-block [perspective:500px]', className)}
      style={{
        '--shimmering-color': shimmeringColor,
        '--color': color,
        color: 'var(--color)',
      }}
      {...props}
    >
      {text?.split('')?.map((char, i) => (
        <motion.span
          animate={{
            ...(wave
              ? {
                  x: [0, 5, 0],
                  y: [0, -5, 0],
                  scale: [1, 1.1, 1],
                  rotateY: [0, 15, 0],
                }
              : {}),
            color: ['var(--color)', 'var(--shimmering-color)', 'var(--color)'],
          }}
          className="inline-block whitespace-pre [transform-style:preserve-3d]"
          initial={{
            ...(wave
              ? {
                  scale: 1,
                  rotateY: 0,
                }
              : {}),
            color: 'var(--color)',
          }}
          key={i}
          transition={{
            duration,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: 'loop',
            repeatDelay: text.length * 0.05,
            delay: (i * duration) / text.length,
            ease: 'easeInOut',
            ...transition,
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

export { ShimmeringText };
export default ShimmeringText;
