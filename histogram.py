import matplotlib.pyplot as plt
life_exp = [
    82.3, 78.5, 80.2, 75.1, 77.8, 83.0, 81.5, 79.6, 76.3, 74.5,
    85.2, 80.0, 82.1, 77.3, 79.9, 78.0, 76.8, 80.7, 81.3, 84.0
]
life_exp1950 = [
    45.0, 50.2, 47.8, 42.5, 48.0, 51.3, 46.9, 49.5, 44.1, 43.8,
    52.0, 47.0, 45.5, 49.2, 46.0, 48.3, 50.5, 43.0, 44.9, 41.7
]

# Histogram of life_exp, 15 bins
plt.hist(life_exp, bins = 2)

# Show and clear plot
plt.show()
plt.clf()

