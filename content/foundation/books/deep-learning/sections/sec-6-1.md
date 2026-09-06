# 6.1 Example: Learning XOR

Chapter 6 opens by solving, in full and by hand, the problem that ended the first wave of neural network
research. The example is small enough to check with arithmetic and it demonstrates the entire idea of the
chapter.

## The problem

XOR is a function on $\lbrace 0, 1 \rbrace^2$ returning 1 when exactly one input is 1. There are only
four points, so generalisation is not at issue — the goal is simply to fit them.

Treating it as a regression problem with mean squared error and a linear model
$f(x; w, b) = x^{\top} w + b$, the closed-form solution is $w = 0$ and $b = 0.5$: the model outputs
$0.5$ everywhere. This is not a failure of the optimiser. It is the best a linear model can do, because
when $x_1 = 0$ the output must increase with $x_2$, and when $x_1 = 1$ it must decrease with $x_2$ — and
a linear model has one fixed coefficient for $x_2$.

## The fix

Add a hidden layer computing features $h$, then apply the linear model to $h$ rather than to $x$:

$$
f(x; W, c, w, b) = w^{\top} \max \lbrace 0, W^{\top} x + c \rbrace + b
$$

The nonlinearity matters absolutely. If $h = W^{\top} x$ with no nonlinear function, the composition of
two linear maps is linear and nothing has been gained. The book uses the **rectified linear unit**,
$g(z) = \max\lbrace 0, z \rbrace$, applied elementwise.

A solution — one of many, and here simply given rather than learned — is
every entry of $W$ equal to $1$, $c = (0, -1)$, $w = (1, -2)$ and $b = 0$.

Walk the four inputs through it. Stacking them as rows and multiplying by $W$ gives
$(0,0), (1,1), (1,1), (2,2)$. Adding $c$ gives $(0,-1), (1,0), (1,0), (2,1)$. Applying the rectifier
gives $(0,0), (1,0), (1,0), (2,1)$. Multiplying by $w$ gives $0, 1, 1, 0$ — exactly XOR.

## What the hidden layer did

The two inputs that must produce the same output, $(0,1)$ and $(1,0)$, have been mapped to the *same*
point $(1,0)$ in feature space. The transformed problem is linearly separable because the representation
collapsed a distinction the original space insisted on. That is the whole content of representation
learning, visible in four points.

## My take

The honest caveat the book attaches is important: in a real problem there are billions of parameters and
gradient descent finds the solution, whereas here the solution was written down. Nobody solves XOR this
way. The example demonstrates that a solution *exists*, not that it is findable, and Chapter 8 is about
the gap between those two claims.

It is also worth being precise about what Minsky and Papert established in 1969, because the folklore is
wrong. They proved a perceptron cannot compute XOR, which is true and is demonstrated again above. They
did not prove that multi-layer networks cannot — the two-layer solution here was never in dispute. What
was missing in 1969 was a way to *train* the hidden layer, and back-propagation supplied it seventeen
years later. The first winter was caused by a correct theorem about the wrong model.

The other thing to notice is that the rectifier is doing something specific and not merely "adding
nonlinearity". It discards information: everything below zero maps to zero, and it is exactly that
discarding that merges $(0,1)$ and $(1,0)$. A nonlinearity that was invertible could not have collapsed
them.
