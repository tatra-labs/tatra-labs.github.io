# 4.5 Example: Linear Least Squares

Chapter 4 ends the way Chapter 2 did, by taking one concrete problem and solving it with everything the
chapter introduced.

## The problem, three ways

Minimise

$$
f(x) = \frac{1}{2} \lVert Ax - b \rVert_2^2
$$

The gradient is

$$
\nabla_x f(x) = A^{\top} A x - A^{\top} b
$$

**Gradient descent** iterates $x \leftarrow x - \epsilon (A^{\top} A x - A^{\top} b)$ until the gradient
norm falls below a tolerance. **Newton's method** solves it in a single step, because the function is
exactly quadratic and the second-order Taylor expansion is not an approximation but the function itself.
Setting the gradient to zero also gives the closed-form normal equations directly.

The book then adds the constraint $x^{\top} x \leq 1$ and applies 4.4. The Lagrangian is

$$
L(x, \lambda) = f(x) + \lambda \left( x^{\top} x - 1 \right)
$$

and differentiating gives a solution of the form

$$
x = (A^{\top} A + 2 \lambda I)^{-1} A^{\top} b
$$

with $\lambda$ chosen so the constraint is satisfied — increased while the norm exceeds one, decreased
while it does not. The multiplier can be found by gradient ascent on $\lambda$, or, since the norm is a
monotone function of $\lambda$, by a line search.

## My take

That final expression has now appeared three times in two chapters, and the repetition is the lesson.

In Section 2.9 it was the limit definition of the pseudoinverse, with the coefficient going to zero. Here
it is the solution to a norm-constrained least-squares problem, with the coefficient set by the
constraint radius. In Section 7.1 it will be ridge regression, with the coefficient set by hand as a
hyperparameter. Three derivations, three motivations, one formula.

What this establishes, before a single neural network has appeared, is that **regularisation and
constraint are the same operation viewed from two sides**. Adding $\lambda x^{\top} x$ to a loss is
choosing a ball for the solution to live in; choosing a ball is picking a $\lambda$. The reason Chapter 7
opens with norm penalties rather than with something more obviously neural is that the machinery was
already complete by the end of Chapter 4.

The other useful takeaway is smaller and practical: least squares is the one problem where every method
in the chapter works and agrees. That makes it the reference case for debugging an optimiser, and Section
11.5 recommends exactly that kind of check.
